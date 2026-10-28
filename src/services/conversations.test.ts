import { beforeEach, describe, expect, it, vi } from "vitest";
const { query, from } = vi.hoisted(() => {
  const query: any = {};
  for (const name of ["select", "eq", "is", "order", "range", "insert", "upsert", "single", "delete"]) query[name] = vi.fn(() => query);
  query.then = (resolve: any) => Promise.resolve(query.result).then(resolve);
  return { query, from: vi.fn(() => query) };
});
vi.mock("./supabase", () => ({ supabase: { from } }));
import { conversationTitle, loadConversationMessages, saveConversationMessage } from "./conversations";
beforeEach(() => { vi.clearAllMocks(); query.result = { data: [], error: null }; });
describe("conversation persistence", () => {
  it("loads newest rows before reversing for display and scopes to owner/thread", async () => {
    query.result.data = [ { id: "new", user_id: "u", role: "assistant", content: "b", created_at: "2" }, { id: "old", user_id: "u", role: "user", content: "a", created_at: "1" } ];
    expect((await loadConversationMessages("u", "c")).map(m => m.id)).toEqual(["old", "new"]);
    expect(query.eq).toHaveBeenCalledWith("user_id", "u");
    expect(query.eq).toHaveBeenCalledWith("conversation_id", "c");
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(query.range).toHaveBeenCalledWith(0,49);
  });
  it("preserves legacy messages and supports paging", async () => {
    await loadConversationMessages("u", "legacy", 50);
    expect(query.is).toHaveBeenCalledWith("conversation_id", null);
    expect(query.range).toHaveBeenCalledWith(50,99);
  });
  it("propagates fetch errors instead of showing empty history", async () => {
    query.result.error = new Error("unavailable");
    await expect(loadConversationMessages("u", "c")).rejects.toThrow("unavailable");
  });
  it("uses stable request key for retry-safe message persistence", async () => {
    query.result.data = { id: "m", user_id: "u", role: "user", content: "a", created_at: "1" };
    await saveConversationMessage("u", "c", "user", "a", "request-1");
    expect(query.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "u", conversation_id: "c", client_request_id: "request-1" }), { onConflict: "user_id,client_request_id" });
  });
  it("caps titles and removes line breaks", () => {
    expect(conversationTitle("  Hello\n world ")).toBe("Hello world");
    expect(conversationTitle("x".repeat(130))).toHaveLength(100);
  });
});
