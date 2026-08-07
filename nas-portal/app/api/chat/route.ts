import { NextRequest } from "next/server";
import { buildSystemPrompt } from "@/lib/nas-knowledge";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:4b";

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
}

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const buckets = new Map<string, number[]>();

function getClientIp(req: NextRequest): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf;
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  if (buckets.size > 500) {
    for (const [k, times] of buckets) {
      const fresh = times.filter((t) => t > cutoff);
      if (fresh.length === 0) buckets.delete(k);
      else buckets.set(k, fresh);
    }
  }
  const times = (buckets.get(ip) ?? []).filter((t) => t > cutoff);
  if (times.length >= RATE_MAX) {
    buckets.set(ip, times);
    return true;
  }
  times.push(now);
  buckets.set(ip, times);
  return false;
}

export async function POST(req: NextRequest) {
  if (rateLimited(getClientIp(req))) {
    return new Response(JSON.stringify({ error: "rate limited" }), { status: 429 });
  }

  let body: { messages?: ClientMessage[]; locale?: "zh" | "en" };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), { status: 400 });
  }

  const messages = body.messages ?? [];
  if (
    !Array.isArray(messages) ||
    messages.some((m) => typeof m?.role !== "string" || typeof m?.content !== "string")
  ) {
    return new Response(JSON.stringify({ error: "invalid messages" }), { status: 400 });
  }
  const last = messages[messages.length - 1]?.content?.trim();
  if (!last || last.length > 2000) {
    return new Response(JSON.stringify({ error: "empty or too long message" }), { status: 400 });
  }

  const locale = body.locale === "en" ? "en" : "zh";
  const systemPrompt = buildSystemPrompt(locale);
  const history = messages.slice(-12).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content.slice(0, 4000),
  }));

  let upstream: Response;
  try {
    upstream = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...history],
        options: { temperature: 0.6 },
      }),
    });
  } catch {
    return new Response(JSON.stringify({ error: "Ollama offline" }), { status: 503 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ error: "Ollama error" }), { status: 502 });
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
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
            let json: { message?: { content?: string } };
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
            const json = JSON.parse(trimmed);
            const content = json.message?.content ?? "";
            if (content) controller.enqueue(encoder.encode(content));
          } catch {
            // ignore malformed final line
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
