import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppMenuButton } from "@/components/ui/AppMenu";
import { BlueBackground } from "@/components/ui/BlueBackground";
import { Button } from "@/components/ui/Button";
import { Body } from "@/components/ui/Body";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/contexts/UserDataContext";
import { AiAccessError, chat } from "@/services/gemini";
import { Conversation, createConversation, deleteConversation, LEGACY_CONVERSATION, listConversations, loadConversationMessages, MESSAGE_PAGE_SIZE, saveConversationMessage } from "@/services/conversations";
import type { ChatMessage } from "@/types";
import { colors, typography } from "@/theme";

type Pending = { requestId: string; text: string; conversationId: string | null; userMessage?: ChatMessage; reply?: string; history: ChatMessage[] };
export default function ChatbotScreen() {
  const { user } = useAuth();
  return user ? <ConversationScreen key={user.id} userId={user.id} /> : null;
}

function ConversationScreen({ userId }: { userId: string }) {
  const context = useUserData();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [more, setMore] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const mounted = useRef(true);
  const busyRef = useRef(false);
  const generation = useRef(0);
  const scroll = useRef<ScrollView>(null);
  const draftKey = conversationId ?? "new";
  const draft = drafts[draftKey] ?? "";
  useEffect(() => {
    mounted.current = true;
    generation.current++;
    return () => { mounted.current = false; };
  }, []);

  function newConversation() {
    if (busyRef.current) return;
    generation.current++;
    setLoading(false);
    setConversationId(null);
    setMessages([]);
    setPending(null);
    setMore(false);
    setError(null);
    setHistoryOpen(false);
  }
  async function openHistory() {
    if (busyRef.current || loading) return;
    const token = ++generation.current;
    setHistoryOpen(true);
    setHistoryError(null);
    setLoading(true);
    try {
      const rows = await listConversations(userId);
      if (mounted.current && token === generation.current) setConversations(rows);
    } catch {
      if (mounted.current && token === generation.current) setHistoryError("Couldn't load conversations. Please try again.");
    } finally { if (mounted.current && token === generation.current) setLoading(false); }
  }
  async function openConversation(id: string, older = false) {
    if (busyRef.current) return;
    const token = ++generation.current;
    setLoading(true);
    setError(null);
    setHistoryOpen(false);
    if (!older) { setConversationId(id); setMessages([]); setPending(null); setMore(false); }
    try {
      const rows = await loadConversationMessages(userId, id, older ? messages.length : 0);
      if (!mounted.current || token !== generation.current) return;
      setMessages(previous => older ? [...rows, ...previous] : rows);
      setMore(rows.length === MESSAGE_PAGE_SIZE);
      if (!older && id !== LEGACY_CONVERSATION && rows.at(-1)?.role === "user") {
        const last = rows[rows.length - 1];
        setPending({ requestId: `reply-${last.id}`, text: last.content, conversationId: id, userMessage: last, history: rows.slice(0, -1).slice(-20) });
        setError("This message has no saved reply yet. You can retry it.");
      }
    } catch {
      if (mounted.current && token === generation.current) setError("Couldn't load this conversation. Please retry before sending a message.");
    } finally { if (mounted.current && token === generation.current) setLoading(false); }
  }
  async function send() {
    if (busyRef.current || loading || conversationId === LEGACY_CONVERSATION) return;
    const text = pending?.text ?? draft.trim();
    if (!text) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    generation.current++;
    const attempt = pending ?? { requestId: `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`, text, conversationId, history: messages.slice(-20) };
    setPending(attempt);
    try {
      if (!attempt.conversationId) {
        const created = await createConversation(userId, text, attempt.requestId);
        attempt.conversationId = created.id;
        if (!mounted.current) return;
        setConversationId(created.id);
        setConversations(previous => [created, ...previous]);
        setDrafts(previous => ({ ...previous, [created.id]: previous.new ?? "", new: "" }));
      }
      if (!attempt.userMessage) {
        attempt.userMessage = await saveConversationMessage(userId, attempt.conversationId, "user", text, attempt.requestId);
        if (!mounted.current) return;
        setMessages(previous => [...previous, attempt.userMessage!]);
      }
      if (attempt.reply === undefined) {
        attempt.reply = await chat(text, attempt.history, {
          profile: context.profile, pregnancyHistory: context.pregnancyHistory,
          familyHistory: context.familyHistory, recentBp: context.recentBp, recentMood: context.recentMood,
        });
      }
      if (!mounted.current) return;
      const reply = await saveConversationMessage(userId, attempt.conversationId, "assistant", attempt.reply, `reply-${attempt.userMessage.id}`);
      if (!mounted.current) return;
      setMessages(previous => [...previous, reply]);
      setDrafts(previous => ({ ...previous, [attempt.conversationId!]: "" }));
      setPending(null);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    } catch (cause) {
      if (!mounted.current) return;
      setPending({ ...attempt });
      setError(cause instanceof AiAccessError ? cause.message : "Couldn't finish this reply. Your text is kept here. Retry to continue.");
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function confirmDelete() {
    if (!deleteTarget || busyRef.current) return;
    const target = deleteTarget;
    generation.current++;
    setLoading(false);
    busyRef.current = true;
    setBusy(true);
    setHistoryError(null);
    try {
      await deleteConversation(userId, target.id);
      if (!mounted.current) return;
      setConversations(previous => previous.filter(item => item.id !== target.id));
      setDrafts(previous => { const next = { ...previous }; delete next[target.id]; return next; });
      setDeleteTarget(null);
      if (conversationId === target.id) { setConversationId(null); setMessages([]); setPending(null); setMore(false); setError(null); }
    } catch { if (mounted.current) setHistoryError("Couldn't delete the conversation. Please try again."); }
    finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  }
  const legacy = conversationId === LEGACY_CONVERSATION;
  const fetchFailed = Boolean(error && !pending);
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom", "left", "right"]}>
      <BlueBackground />
      <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Text style={styles.brand}>Kairos</Text>
        <View style={styles.toolbar}>
          <Button label="View Chat History" variant="secondary" disabled={busy || loading} onPress={openHistory} />
          {(conversationId || messages.length > 0) && <Button label="New chat" variant="ghost" disabled={busy} onPress={newConversation} />}
        </View>
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.messages}>
          {loading && <ActivityIndicator color="white" accessibilityLabel="Loading conversation" />}
          {more && <Button label="Load earlier messages" variant="ghost" disabled={busy || loading} onPress={() => conversationId && openConversation(conversationId, true)} />}
          {!loading && !error && messages.length === 0 && <View style={styles.welcome}>
            <View style={styles.orb} />
            <Text style={styles.title}>{legacy ? "No earlier messages" : "What’s on your mind?"}</Text>
            <Text style={styles.subtitle}>{legacy ? "Start a new chat whenever you're ready." : "Let’s tackle it together."}</Text>
          </View>}
          {messages.map(message => <View key={message.id} style={[styles.messageRow, message.role === "user" && styles.userRow]}>
            {message.role === "assistant" && <View style={styles.smallOrb} />}
            <View style={[styles.bubble, message.role === "user" && styles.userBubble]}><Body>{message.content}</Body></View>
          </View>)}
          {busy && !deleteTarget && <Body tone="muted">Kairos is working…</Body>}
          {error && <View style={styles.errorBox}>
            <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
            {pending ? <Button label="Retry reply" onPress={send} disabled={busy} /> : conversationId && <Button label="Retry loading" disabled={busy || loading} onPress={() => openConversation(conversationId)} />}
          </View>}
        </ScrollView>
        <View style={styles.footer}>
          {legacy ? <Button label="Start a new chat" onPress={newConversation} /> : <View style={styles.composer}>
            <TextInput accessibilityLabel="Ask a question" value={draft} onChangeText={value => setDrafts(previous => ({ ...previous, [draftKey]: value }))}
              placeholder="Ask a question" placeholderTextColor={colors.fg.muted} style={styles.input}
              editable={!busy && !loading && !pending && !fetchFailed} multiline maxLength={1000} />
            <Pressable accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: busy || loading || !!pending || fetchFailed || !draft.trim() }}
              disabled={busy || loading || !!pending || fetchFailed || !draft.trim()} onPress={send}
              style={({ pressed }) => [styles.send, (pressed || busy || loading || !!pending || fetchFailed || !draft.trim()) && styles.dimmed]}><Text style={styles.sendText}>Send</Text></Pressable>
          </View>}
          <Text style={styles.disclaimer}>AI assistant · Discuss medical decisions with your healthcare provider.</Text>
        </View>
      </KeyboardAvoidingView>
      <AppMenuButton />
      <Modal transparent animationType="fade" visible={historyOpen} onRequestClose={() => { if (!busy) { generation.current++; setLoading(false); setHistoryOpen(false); setDeleteTarget(null); } }}>
        <SafeAreaView style={styles.overlay}>
          <View style={styles.historyPanel}>
            <Text style={styles.historyTitle}>{deleteTarget ? "Delete conversation?" : "Chat history"}</Text>
            {deleteTarget ? <>
              <Text style={styles.historyText}>This permanently deletes “{deleteTarget.title}” and its messages.</Text>
              {historyError && <Text accessibilityRole="alert" style={styles.historyError}>{historyError}</Text>}
              <Pressable accessibilityRole="button" disabled={busy} onPress={confirmDelete} style={styles.historyButton}><Text style={styles.historyText}>{busy ? "Deleting…" : "Delete conversation"}</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => setDeleteTarget(null)} style={styles.historyButton}><Text style={styles.historyText}>Cancel</Text></Pressable>
            </> : <>
              <ScrollView contentContainerStyle={{ gap: 8 }}>
                {loading && <ActivityIndicator color="#172D52" />}
                {historyError && <Text accessibilityRole="alert" style={styles.historyError}>{historyError}</Text>}
                {historyError && <Pressable accessibilityRole="button" onPress={openHistory} style={styles.historyButton}><Text style={styles.historyText}>Retry loading history</Text></Pressable>}
                <Pressable accessibilityRole="button" disabled={busy} onPress={newConversation} style={styles.historyButton}><Text style={styles.historyText}>＋ New conversation</Text></Pressable>
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => openConversation(LEGACY_CONVERSATION)} style={styles.historyButton}><Text style={styles.historyText}>Earlier conversation</Text></Pressable>
                {conversations.map(item => <View key={item.id} style={styles.historyRow}>
                  <Pressable accessibilityRole="button" accessibilityState={{ selected: conversationId === item.id }} disabled={busy} onPress={() => openConversation(item.id)} style={styles.historyLink}>
                    <Text style={styles.historyText}>{item.title}</Text><Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${item.title}`} disabled={busy} onPress={() => setDeleteTarget(item)} style={styles.deleteButton}><Text style={styles.historyText}>×</Text></Pressable>
                </View>)}
              </ScrollView>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => { generation.current++; setLoading(false); setHistoryOpen(false); }} style={styles.historyButton}><Text style={styles.historyText}>Close history</Text></Pressable>
            </>}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.page },
  page: { flex: 1, width: "100%", maxWidth: 520, alignSelf: "center" },
  brand: { color: "white", fontFamily: typography.family.brand, fontSize: 24, textAlign: "center", marginTop: 26, marginBottom: 20 },
  toolbar: { flexDirection: "row", justifyContent: "center", gap: 12, paddingHorizontal: 16, flexWrap: "wrap" },
  messages: { padding: 24, gap: 18, flexGrow: 1 },
  welcome: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20, paddingVertical: 40 },
  orb: { width: 180, height: 180, borderRadius: 90, backgroundColor: "#DEEAFF", shadowColor: "#DEEAFF", shadowOpacity: 0.8, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, marginBottom: 20 },
  title: { color: "white", fontSize: 30, lineHeight: 40, textAlign: "center" },
  subtitle: { color: colors.fg.muted, fontSize: 20, textAlign: "center" },
  messageRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  userRow: { justifyContent: "flex-end" },
  smallOrb: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#DEEAFF" },
  bubble: { maxWidth: "82%", padding: 16, borderRadius: 8, backgroundColor: "rgba(20,63,183,0.81)", borderWidth: 1, borderColor: colors.border.faint },
  userBubble: { backgroundColor: "rgba(255,255,255,0.08)", borderColor: colors.border.default },
  footer: { paddingLeft: 76, paddingRight: 16, paddingBottom: 10, gap: 8 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: { flex: 1, minHeight: 52, maxHeight: 140, borderRadius: 8, borderWidth: 1, borderColor: colors.border.default, padding: 12, color: "white", fontSize: 16, backgroundColor: "rgba(20,63,183,0.81)" },
  send: { minWidth: 54, minHeight: 52, justifyContent: "center", alignItems: "center", borderRadius: 8, backgroundColor: "rgba(20,63,183,0.81)" },
  sendText: { color: "white", fontWeight: "600" },
  dimmed: { opacity: 0.4 },
  disclaimer: { color: colors.fg.muted, fontSize: 11, lineHeight: 16 },
  errorBox: { gap: 12, padding: 12, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.15)" },
  errorText: { color: "#FFE1D8", fontSize: 15, lineHeight: 22 },
  overlay: { flex: 1, backgroundColor: "rgba(8,42,113,0.6)", padding: 20, justifyContent: "center" },
  historyPanel: { maxHeight: "90%", width: "100%", maxWidth: 400, borderRadius: 32, backgroundColor: "#DDE9FF", padding: 24, gap: 16 },
  historyTitle: { fontSize: 24, fontWeight: "600", color: "#172D52" },
  historyText: { color: "#172D52", fontSize: 16, lineHeight: 24 },
  historyDate: { color: "#4C6280", fontSize: 12, marginTop: 3 },
  historyRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.35)" },
  historyLink: { flex: 1, minHeight: 60, padding: 12 },
  historyButton: { minHeight: 48, justifyContent: "center", padding: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.55)" },
  deleteButton: { width: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  historyError: { color: "#9C271D", lineHeight: 22 },
});
