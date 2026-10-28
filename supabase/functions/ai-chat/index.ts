/**
 * ai-chat — server-side proxy to ZotGPT (UCI's Portkey gateway).
 *
 * Keeps the ZotGPT key out of the app bundle: the app sends chat messages
 * here via `supabase.functions.invoke`, and this function adds the key.
 *
 * Only signed-in, non-anonymous users may call it. Anonymous sign-ins are
 * enabled for the dev "skip" login, and anyone holding the (public)
 * publishable key can mint an anonymous session — accepting those would
 * re-expose the quota the key move is meant to protect.
 *
 * The model is fixed server-side and request size / reply length are
 * capped, so a signed-in user can't turn the proxy into an unbounded GPT.
 *
 * Secrets: ZOTGPT_API_KEY (required), ZOTGPT_MODEL (optional).
 */

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const GATEWAY_URL = "https://api.portkey.ai/v1/chat/completions";
const DEFAULT_MODEL = "@zotgpt-api-azure/gpt-4o";

// Sized for the largest legitimate caller. The chatbot sends system + up
// to 20 history messages + the new one; the doctor summary sends one
// message carrying ~30 days of rows and wants a 2000-token reply.
const MAX_MESSAGES = 30;
const MAX_TOTAL_CHARS = 100_000;
const MAX_COMPLETION_TOKENS = 2000;
const DEFAULT_COMPLETION_TOKENS = 800;
const UPSTREAM_TIMEOUT_MS = 60_000;

const ROLES = new Set(["system", "user", "assistant"]);

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ProxyRequest {
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  jsonResponse: boolean;
}

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Returns the validated request, or an error Response to send back. */
function parseRequest(body: unknown): ProxyRequest | Response {
  if (typeof body !== "object" || body === null) {
    return errorResponse(400, "invalid_request", "Body must be a JSON object.");
  }
  const { messages, temperature, maxTokens, jsonResponse } = body as Record<string, unknown>;

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return errorResponse(400, "invalid_request", `messages must be an array of 1-${MAX_MESSAGES} items.`);
  }
  let totalChars = 0;
  for (const m of messages) {
    const { role, content } = (m ?? {}) as Record<string, unknown>;
    if (typeof role !== "string" || !ROLES.has(role) || typeof content !== "string") {
      return errorResponse(400, "invalid_request", "Each message needs a valid role and string content.");
    }
    totalChars += content.length;
  }
  if (totalChars > MAX_TOTAL_CHARS) {
    return errorResponse(413, "payload_too_large", `messages exceed ${MAX_TOTAL_CHARS} characters.`);
  }

  return {
    messages: messages as ChatMessage[],
    temperature: typeof temperature === "number" ? clamp(temperature, 0, 1) : 0.7,
    maxTokens:
      typeof maxTokens === "number"
        ? clamp(Math.floor(maxTokens), 1, MAX_COMPLETION_TOKENS)
        : DEFAULT_COMPLETION_TOKENS,
    jsonResponse: jsonResponse === true,
  };
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return errorResponse(405, "method_not_allowed", "Use POST.");
    }
    if (ctx.jwtClaims?.is_anonymous === true) {
      return errorResponse(403, "anonymous_not_allowed", "Sign in with your email to use AI features.");
    }

    const apiKey = Deno.env.get("ZOTGPT_API_KEY");
    if (!apiKey) {
      console.error("[ai-chat] ZOTGPT_API_KEY secret is not set");
      return errorResponse(500, "not_configured", "AI service is not configured.");
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse(400, "invalid_request", "Body must be valid JSON.");
    }
    const parsed = parseRequest(body);
    if (parsed instanceof Response) return parsed;

    const upstreamBody: Record<string, unknown> = {
      model: Deno.env.get("ZOTGPT_MODEL") ?? DEFAULT_MODEL,
      messages: parsed.messages,
      temperature: parsed.temperature,
      max_completion_tokens: parsed.maxTokens,
    };
    if (parsed.jsonResponse) {
      upstreamBody.response_format = { type: "json_object" };
    }

    let upstream: Response;
    try {
      upstream = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(upstreamBody),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === "TimeoutError";
      console.error("[ai-chat] gateway request failed:", err);
      return timedOut
        ? errorResponse(504, "upstream_timeout", "AI service took too long to respond.")
        : errorResponse(502, "upstream_error", "AI service is unavailable.");
    }

    if (!upstream.ok) {
      // Provider error bodies can carry deployment/quota details; log them
      // here and give the app only a stable code.
      const detail = await upstream.text().catch(() => "");
      console.error(`[ai-chat] gateway ${upstream.status}: ${detail.slice(0, 500)}`);
      return errorResponse(502, "upstream_error", "AI service is unavailable.");
    }

    const data = await upstream.json().catch(() => null);
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      console.error("[ai-chat] unexpected gateway response shape");
      return errorResponse(502, "upstream_error", "AI service returned an unexpected response.");
    }
    return Response.json({ content });
  }),
};
