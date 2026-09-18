import { NextRequest } from "next/server";
import { buildProfileSystemPrompt, type ProfileContext } from "@/lib/profile-knowledge";
import { isRateLimited } from "@/lib/rate-limit";
import { corsHeaders } from "@/lib/cors";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:4b";

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
}

interface OllamaLine {
  message?: {
    content?: string;
  };
  done?: boolean;
  error?: string;
}

function sanitizeProfile(raw: unknown): ProfileContext | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const input = raw as { name?: unknown; prefs?: unknown };
  const profile: ProfileContext = {};

  if (typeof input.name === "string") {
    const name = input.name.trim().slice(0, 60);
    if (name) profile.name = name;
  }

  if (Array.isArray(input.prefs)) {
    const prefs = input.prefs
      .filter((p): p is string => typeof p === "string")
      .map((p) => p.trim().slice(0, 120))
      .filter((p) => p.length > 0)
      .slice(0, 6);
    if (prefs.length > 0) profile.prefs = prefs;
  }

  return profile.name || profile.prefs ? profile : undefined;
}

async function runProfileChat(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  systemPrompt: string,
  history: { role: string; content: string }[]
) {
  const messages: any[] = [{ role: "system", content: systemPrompt }, ...history];

  let upstream: Response;
  try {
    upstream = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: true,
        messages,
        options: { temperature: 0.6 },
      }),
    });
  } catch (err) {
    controller.error(err);
    return;
  }

  if (!upstream.ok || !upstream.body) {
    controller.enqueue(encoder.encode(`\n[服务暂时不可用]`));
    return;
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("{")) continue;
        let json: OllamaLine;
        try {
          json = JSON.parse(trimmed);
        } catch {
          continue;
        }
        const content = json.message?.content ?? "";
        if (content) controller.enqueue(encoder.encode(content));
      }
    }
    buffer += decoder.decode();
    const trimmed = buffer.trim();
    if (trimmed.startsWith("{")) {
      try {
        const json = JSON.parse(trimmed) as OllamaLine;
        const content = json.message?.content ?? "";
        if (content) controller.enqueue(encoder.encode(content));
      } catch {
        // ignore malformed final line
      }
    }
  } catch (err) {
    controller.error(err);
    return;
  } finally {
    reader.releaseLock();
  }
}

export async function POST(req: NextRequest) {
  if (isRateLimited(req)) {
    return new Response(JSON.stringify({ error: "rate limited" }), {
      status: 429,
      headers: { "Content-Type": "application/json", ...corsHeaders(req) },
    });
  }

  let body: { messages?: ClientMessage[]; locale?: "zh" | "en"; profile?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders(req) },
    });
  }

  const messages = body.messages ?? [];
  if (
    !Array.isArray(messages) ||
    messages.some((m) => typeof m?.role !== "string" || typeof m?.content !== "string")
  ) {
    return new Response(JSON.stringify({ error: "invalid messages" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders(req) },
    });
  }
  const last = messages[messages.length - 1]?.content?.trim();
  if (!last || last.length > 2000) {
    return new Response(JSON.stringify({ error: "empty or too long message" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders(req) },
    });
  }

  const locale = body.locale === "en" ? "en" : "zh";
  const profile = sanitizeProfile(body.profile);
  const systemPrompt = buildProfileSystemPrompt(locale, profile);
  const history = messages.slice(-12).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content.slice(0, 4000),
  }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      await runProfileChat(controller, encoder, systemPrompt, history);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
      ...corsHeaders(req),
    },
  });
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
