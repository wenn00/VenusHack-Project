/**
 * AI Chatbot.
 *
 * A Gemini-backed conversational assistant. The user's profile and
 * recent vitals are fed into the system prompt so answers are
 * personalised. Messages are persisted to `chat_messages` so the
 * thread survives reloads.
 *
 * Tip for users: tap the microphone icon on the iOS keyboard to
 * dictate a question hands-free.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppMenuButton } from "@/components/ui/AppMenu";
import { BlueBackground } from "@/components/ui/BlueBackground";
import { Body } from "@/components/ui/Body";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/contexts/UserDataContext";
import { chat } from "@/services/gemini";
import { supabase } from "@/services/supabase";
import { ChatMessage } from "@/types";
import { colors, radius, spacing, typography } from "@/theme";

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  userId: "system",
  role: "assistant",
  content:
    "Hi, I'm here to answer questions about your pregnancy and heart health. What's on your mind today?",
  createdAt: new Date().toISOString(),
};

export default function ChatbotScreen() {
  const { user } = useAuth();
  const { profile, pregnancyHistory, familyHistory, recentBp, recentMood } = useUserData();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Load the existing conversation on mount.
  useEffect(() => {
    if (!user) return;
    supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data, error }) => {
        if (error) {
          console.warn("[chatbot] failed to load history:", error);
          return;
        }
        const mapped: ChatMessage[] = (data ?? []).map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          role: row.role,
          content: row.content,
          createdAt: row.created_at,
        }));
        setMessages(mapped);
      });
  }, [user]);

  // Auto-scroll on new message.
  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages.length, isSending]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || isSending || !user) return;

    setDraft("");
    setIsSending(true);

    const now = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      userId: user.id,
      role: "user",
      content: text,
      createdAt: now,
    };
    const historyForAi = [...messages];
    setMessages((prev) => [...prev, userMessage]);

    // Persist the user message; don't block the model call on this.
    supabase
      .from("chat_messages")
      .insert({ user_id: user.id, role: "user", content: text })
      .then(({ error }) => {
        if (error) console.warn("[chatbot] persist user message failed:", error);
      });

    try {
      const reply = await chat(text, historyForAi, {
        profile,
        pregnancyHistory,
        familyHistory,
        recentBp,
        recentMood,
      });

      const assistantMessage: ChatMessage = {
        id: `local-${Date.now() + 1}`,
        userId: user.id,
        role: "assistant",
        content: reply.trim(),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      supabase
        .from("chat_messages")
        .insert({ user_id: user.id, role: "assistant", content: reply.trim() })
        .then(({ error }) => {
          if (error) console.warn("[chatbot] persist reply failed:", error);
        });
    } catch (err) {
      const message = (err as Error)?.message ?? String(err);
      console.warn("[chatbot] gemini call failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now() + 2}`,
          userId: user.id,
          role: "assistant",
          // Surface the real error in-app temporarily so we can debug
          // model / key / quota issues without diving into metro logs.
          content: `⚠️ Gemini error: ${message}\n\n(This message is shown for debugging — will become a friendly fallback once the API is verified.)`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [draft, isSending, user, messages, profile, pregnancyHistory, familyHistory, recentBp, recentMood]);

  const visible = messages.length === 0 ? [WELCOME_MESSAGE] : messages;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <BlueBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messagesContent}
        >
          {visible.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.bubble,
                msg.role === "user" ? styles.bubbleUser : styles.bubbleAssistant,
              ]}
            >
              <Body style={msg.role === "user" ? styles.textUser : styles.textAssistant}>
                {msg.content}
              </Body>
            </View>
          ))}
          {isSending && (
            <View style={[styles.bubble, styles.bubbleAssistant]}>
              <Body tone="muted">Thinking…</Body>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Body tone="muted" size="sm" style={styles.disclaimer}>
            AI assistant. Always consult your healthcare provider for medical decisions.
          </Body>

          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask anything…"
              placeholderTextColor={colors.fg.muted}
              style={styles.input}
              editable={!isSending}
              multiline
              maxLength={1000}
            />
            <Pressable
              onPress={handleSend}
              disabled={!draft.trim() || isSending}
              style={({ pressed }) => [
                styles.sendButton,
                (!draft.trim() || isSending) && styles.sendButtonDisabled,
                pressed && styles.sendButtonPressed,
              ]}
            >
              <Body style={styles.sendLabel}>Send</Body>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      <AppMenuButton />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg.page,
    position: "relative",
  },
  flex: { flex: 1 },
  messagesContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    flexGrow: 1,
  },
  bubble: {
    maxWidth: "85%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    marginBottom: spacing.xs,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: colors.accent.rose,
  },
  bubbleAssistant: {
    alignSelf: "flex-start",
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  textUser: { color: colors.fg.onAccent },
  textAssistant: { color: colors.fg.primary },
  footer: {
    backgroundColor: colors.bg.card,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  disclaimer: {
    textAlign: "center",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.muted,
    color: colors.fg.primary,
    fontSize: typography.size.md,
  },
  sendButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.accent.rose,
    minWidth: 80,
    alignItems: "center",
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonPressed: { opacity: 0.85 },
  sendLabel: {
    color: colors.fg.onAccent,
    fontWeight: typography.weight.semibold,
  },
});
