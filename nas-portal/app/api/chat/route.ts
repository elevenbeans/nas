import { NextRequest } from "next/server";
import { buildSystemPrompt } from "@/lib/nas-knowledge";
import { NAS_TOOLS, executeNasTool } from "@/lib/nas-tools";
import { isRateLimited } from "@/lib/rate-limit";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:4b";
const MAX_TOOL_ROUNDS = 3;

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
}

interface ToolCall {
  id?: string;
  function: { name: string; arguments: unknown };
}

interface OllamaLine {
  message?: {
    content?: string;
    tool_calls?: ToolCall[];
  };
  done?: boolean;
  error?: string;
}

function parseToolCalls(json: OllamaLine): ToolCall[] {
  return json.message?.tool_calls ?? [];
}

async function runChatLoop(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  systemPrompt: string,
  history: { role: string; content: string }[],
  tools: typeof NAS_TOOLS
) {
  const messages: any[] = [{ role: "system", content: systemPrompt }, ...history];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let upstream: Response;
    try {
      upstream = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          stream: true,
          messages,
          tools,
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
    let toolCalls: ToolCall[] = [];

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
          const calls = parseToolCalls(json);
          if (calls.length > 0) toolCalls = toolCalls.concat(calls);
          const content = json.message?.content ?? "";
          if (content) controller.enqueue(encoder.encode(content));
        }
      }
      buffer += decoder.decode();
      const trimmed = buffer.trim();
      if (trimmed.startsWith("{")) {
        try {
          const json = JSON.parse(trimmed) as OllamaLine;
          const calls = parseToolCalls(json);
          if (calls.length > 0) toolCalls = toolCalls.concat(calls);
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

    if (toolCalls.length === 0) return;

    messages.push({
      role: "assistant",
      content: "",
      tool_calls: toolCalls.map((c) => ({
        id: c.id,
        type: "function",
        function: { name: c.function.name, arguments: c.function.arguments },
      })),
    });

    for (const call of toolCalls) {
      const args = typeof call.function.arguments === "string"
        ? (() => {
            try {
              return JSON.parse(call.function.arguments);
            } catch {
              return {};
            }
          })()
        : (call.function.arguments ?? {});
      const result = await executeNasTool(call.function.name, args);
      messages.push({ role: "tool", content: result });
    }
  }
}

export async function POST(req: NextRequest) {
  if (isRateLimited(req)) {
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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      await runChatLoop(controller, encoder, systemPrompt, history, NAS_TOOLS);
      controller.close();
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
