import { supabase } from "./supabase";
import type { ChatMessage } from "@/types";
export interface Conversation { id: string; title: string; created_at: string }
export const LEGACY_CONVERSATION = "legacy";
export const MESSAGE_PAGE_SIZE = 50;
export function conversationTitle(text: string): string {
  return text.trim().replace(/\s+/g, " ").slice(0, 100) || "New conversation";
}
export function mapChatMessage(row: any): ChatMessage {
  return { id: row.id, userId: row.user_id, role: row.role, content: row.content, createdAt: row.created_at };
}
export async function listConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase.from("chat_conversations").select("id,title,created_at")
    .eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function createConversation(userId: string, text: string): Promise<Conversation> {
  const { data, error } = await supabase.from("chat_conversations")
    .insert({ user_id: userId, title: conversationTitle(text) }).select("id,title,created_at").single();
  if (error) throw error;
  return data;
}
export async function loadConversationMessages(userId: string, conversationId: string, offset = 0): Promise<ChatMessage[]> {
  let query = supabase.from("chat_messages").select("id,user_id,role,content,created_at")
    .eq("user_id", userId);
  query = conversationId === LEGACY_CONVERSATION ? query.is("conversation_id", null) : query.eq("conversation_id", conversationId);
  const { data, error } = await query.order("created_at", { ascending: false })
    .order("id", { ascending: false }).range(offset, offset + MESSAGE_PAGE_SIZE - 1);
  if (error) throw error;
  return [...(data ?? [])].reverse().map(mapChatMessage);
}
export async function saveConversationMessage(userId: string, conversationId: string, role: "user" | "assistant", content: string, requestId: string): Promise<ChatMessage> {
  const { data, error } = await supabase.from("chat_messages").upsert({ user_id: userId,
    conversation_id: conversationId, role, content, client_request_id: requestId,
  }, { onConflict: "user_id,client_request_id" }).select("id,user_id,role,content,created_at").single();
  if (error) throw error;
  return mapChatMessage(data);
}
export async function deleteConversation(userId: string, conversationId: string) {
  const { error } = await supabase.from("chat_conversations").delete().eq("user_id", userId).eq("id", conversationId);
  if (error) throw error;
}
