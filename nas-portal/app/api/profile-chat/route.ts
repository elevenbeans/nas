import { NextRequest } from "next/server";
import { buildProfileSystemPrompt, type ProfileContext } from "@/lib/profile-knowledge";
import { isRateLimited } from "@/lib/rate-limit";
import { corsHeaders, isRequestAllowed } from "@/lib/cors";
import { PROJECT_DOC_TOOLS, executeProjectTool, matchProjectDocs } from "@/lib/project-docs";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL =
  process.env.PROFILE_OLLAMA_MODEL || process.env.OLLAMA_MODEL || "qwen2.5:3b";
const MAX_TOOL_ROUNDS = 3;
const MAX_INJECT_CHARS = 10_000;
const UNAVAILABLE_TEXT = "[服务暂时不可用]";

type StreamMode = "text" | "ndjson";

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

interface ToolCallEvent {
  id: string;
  name: string;
  args: unknown;
}

interface ToolResultEvent {
  id: string;
  name: string;
  ok: boolean;
  summary: string;
  ms: number;
}

interface DocBlock {
  project: string;
  content: string;
  ms: number;
}

interface Sink {
  text(value: string): void;
  toolCall(call: ToolCallEvent): void;
  toolResult(result: ToolResultEvent): void;
  error(): void;
}

function parseToolCalls(json: OllamaLine): ToolCall[] {
  return json.message?.tool_calls ?? [];
}

function parseToolArguments(args: unknown): Record<string, unknown> {
  if (typeof args === "string") {
    try {
      const parsed = JSON.parse(args);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  if (args && typeof args === "object") return args as Record<string, unknown>;
  return {};
}

function toolResultOk(result: string): boolean {
  try {
    const parsed = JSON.parse(result) as unknown;
    return !(parsed && typeof parsed === "object" && "error" in parsed);
  } catch {
    return true;
  }
}

function summarizeToolResult(result: string): string {
  try {
    const parsed = JSON.parse(result) as {
      content?: unknown;
      sources?: unknown;
      error?: unknown;
    };
    if (typeof parsed.error === "string") return parsed.error;
    if (typeof parsed.content === "string") {
      const sources = Array.isArray(parsed.sources) ? parsed.sources.length : 0;
      const chars = parsed.content.length.toLocaleString("en-US");
      return `${chars} chars${sources ? ` \u00b7 ${sources} file${sources > 1 ? "s" : ""}` : ""}`;
    }
    return "ok";
  } catch {
    return "ok";
  }
}

/**
 * The same handler serves two protocols:
 *  - text/plain (default): the legacy raw stream, so cached older clients keep working.
 *  - application/x-ndjson (negotiated via `Accept`): text deltas plus real
 *    tool_call / tool_result events, which the site renders as cards.
 */
function createSink(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  mode: StreamMode,
  unavailableMessage: string
): Sink {
  const write = (text: string) => controller.enqueue(encoder.encode(text));

  if (mode === "text") {
    return {
      text: write,
      toolCall: () => {},
      toolResult: () => {},
      error: () => write(`\n${UNAVAILABLE_TEXT}`),
    };
  }

  const send = (event: unknown) => write(`${JSON.stringify(event)}\n`);
  return {
    text: (value: string) => {
      if (value) send({ type: "text", value });
    },
    toolCall: (call: ToolCallEvent) =>
      send({ type: "tool_call", id: call.id, name: call.name, args: call.args }),
    toolResult: (result: ToolResultEvent) => send({ type: "tool_result", ...result }),
    error: () => send({ type: "error", code: "unavailable", message: unavailableMessage }),
  };
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
  sink: Sink,
  systemMessages: { role: string; content: string }[],
  history: { role: string; content: string }[],
  tools: unknown[] | undefined
) {
  const messages: any[] = [...systemMessages, ...history];

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
          ...(tools ? { tools } : {}),
          options: { temperature: 0.3, num_ctx: 8192, num_predict: 512 },
        }),
      });
    } catch {
      sink.error();
      return;
    }

    if (!upstream.ok || !upstream.body) {
      sink.error();
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
          if (content) sink.text(content);
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
          if (content) sink.text(content);
        } catch {
          // ignore malformed final line
        }
      }
    } catch {
      sink.error();
      return;
    } finally {
      reader.releaseLock();
    }

    if (toolCalls.length === 0) return;

    const normalized = toolCalls.map((call, index) => ({
      id: call.id || `call_${round}_${index}`,
      type: "function" as const,
      function: {
        name: call.function?.name ?? "",
        arguments: call.function?.arguments ?? {},
      },
    }));

    messages.push({
      role: "assistant",
      content: "",
      tool_calls: normalized,
    });

    for (const call of normalized) {
      const args = parseToolArguments(call.function.arguments);
      sink.toolCall({ id: call.id, name: call.function.name, args });

      const startedAt = Date.now();
      const result = executeProjectTool(call.function.name, args);
      sink.toolResult({
        id: call.id,
        name: call.function.name,
        ok: toolResultOk(result),
        summary: summarizeToolResult(result),
        ms: Date.now() - startedAt,
      });

      messages.push({
        role: "tool",
        tool_name: call.function.name,
        content: result,
      });
    }
  }
}

export async function POST(req: NextRequest) {
  if (!isRequestAllowed(req)) {
    console.warn(
      "profile-chat: forbidden origin",
      "origin=" + (req.headers.get("origin") ?? "-"),
      "referer=" + (req.headers.get("referer") ?? "-")
    );
    return new Response(JSON.stringify({ error: "forbidden origin" }), {
      status: 403,
      headers: { "Content-Type": "application/json", Vary: "Origin" },
    });
  }

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
  if (!body || typeof body !== "object") {
    return new Response(JSON.stringify({ error: "invalid body" }), {
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

  const systemMessages: { role: string; content: string }[] = [
    { role: "system", content: systemPrompt },
  ];

  const recentTexts = history.slice(-4).map((m) => m.content);
  const matchedProjects = matchProjectDocs(...recentTexts).slice(0, 2);
  const docBlocks: DocBlock[] = [];
  let injected = "";
  for (const project of matchedProjects) {
    const startedAt = Date.now();
    const raw = executeProjectTool("get_project_doc", { project });
    const ms = Date.now() - startedAt;
    try {
      const parsed = JSON.parse(raw) as { content?: unknown; url?: unknown };
      if (typeof parsed.content !== "string" || !parsed.content) continue;
      docBlocks.push({ project, content: parsed.content, ms });
      const url = typeof parsed.url === "string" ? ` (${parsed.url})` : "";
      injected += `### Project: ${project}${url}\n${parsed.content}\n\n`;
    } catch {
      continue;
    }
  }
  const docContext = injected.slice(0, MAX_INJECT_CHARS).trim();
  if (docContext) {
    systemMessages.push({
      role: "system",
      content:
        (locale === "zh"
          ? "相关项目文档已直接提供如下。请只依据它、用不超过 5 句话回答；不要复述或粘贴文档内容。\n\n"
          : "The relevant project documentation is provided directly below. Answer ONLY from it, in at most 5 sentences; do not repeat or paste the document.\n\n") +
        docContext,
    });
  }
  const tools = docContext ? undefined : PROJECT_DOC_TOOLS;

  const LIVE_STATE_RE =
    /使用率|剩余空间|多少空间|可用空间|根目录.*(有|列表)|文件列表|当前(文件|状态|使用|列表)|现在(文件|状态|使用|列表)|实时|service status|storage usage|disk usage|how (much|full)|currently|right now|list (the )?files|current (files|status|usage)/i;
  if (LIVE_STATE_RE.test(last)) {
    systemMessages.push({
      role: "system",
      content:
        locale === "zh"
          ? "规则（不要照抄本句）：用户若询问存储使用率、当前文件、服务状态、IP 等实时信息，请用你自己的话简短说明你无法访问 NAS 的实时数据，并建议使用 NAS 门户自带的助手 https://nas.elevenbeans.me/chat 。"
          : "Rule (do not quote this sentence): if the user asks for live data such as storage usage, current files, service status, or IP, briefly say in your own words that you cannot access the NAS's live data and suggest the NAS portal's own assistant at https://nas.elevenbeans.me/chat .",
    });
  }

  const wantsEvents = (req.headers.get("accept") ?? "").includes("application/x-ndjson");
  const mode: StreamMode = wantsEvents ? "ndjson" : "text";
  const unavailableMessage =
    locale === "zh" ? "服务暂时不可用，请稍后再试。" : "The assistant is temporarily unavailable. Please try again later.";
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sink = createSink(controller, encoder, mode, unavailableMessage);
      try {
        // Deterministic grounding is a real tool execution: emit the same
        // tool_call / tool_result pair the model-driven path emits, so the
        // UI shows what actually happened instead of a silent prompt injection.
        for (const block of docBlocks) {
          const id = `doc_${block.project}`;
          sink.toolCall({
            id,
            name: "get_project_doc",
            args: { project: block.project },
          });
          sink.toolResult({
            id,
            name: "get_project_doc",
            ok: true,
            summary: `${block.content.length.toLocaleString("en-US")} chars`,
            ms: block.ms,
          });
        }

        await runProfileChat(sink, systemMessages, history, tools);
      } catch {
        sink.error();
      } finally {
        if (mode === "ndjson") {
          controller.enqueue(encoder.encode(`${JSON.stringify({ type: "done" })}\n`));
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":
        mode === "ndjson" ? "application/x-ndjson; charset=utf-8" : "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
      ...corsHeaders(req),
    },
  });
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
