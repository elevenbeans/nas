import { NextRequest } from "next/server";
import { buildSystemPrompt } from "@/lib/nas-knowledge";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:4b";

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  let body: { messages?: ClientMessage[]; locale?: "zh" | "en" };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), { status: 400 });
  }

  const messages = body.messages ?? [];
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
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
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
