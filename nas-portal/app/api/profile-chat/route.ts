import { NextRequest } from "next/server";
import { buildProfileSystemPrompt, type ProfileContext } from "@/lib/profile-knowledge";
import { isRateLimited } from "@/lib/rate-limit";
import { corsHeaders } from "@/lib/cors";
import { PROJECT_DOC_TOOLS, executeProjectTool, matchProjectDocs, getProjectDocContext } from "@/lib/project-docs";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL =
  process.env.PROFILE_OLLAMA_MODEL || process.env.OLLAMA_MODEL || "qwen2.5:3b";
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
      controller.enqueue(encoder.encode(`\n[服务暂时不可用]`));
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
    } catch {
      controller.enqueue(encoder.encode(`\n[服务暂时不可用]`));
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
      const args =
        typeof call.function.arguments === "string"
          ? (() => {
              try {
                return JSON.parse(call.function.arguments as string);
              } catch {
                return {};
              }
            })()
          : call.function.arguments ?? {};
      const result = executeProjectTool(call.function.name, args);
      messages.push({ role: "tool", content: result });
    }
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
  const matchedProjects = matchProjectDocs(...recentTexts);
  const docContext = getProjectDocContext(matchedProjects);
  if (docContext) {
    systemMessages.push({
      role: "system",
      content:
        (locale === "zh"
          ? "相关项目文档已直接提供如下。请只依据它、用不超过 5 句话回答；不要复述或粘贴文档内容，不要调用任何工具。\n\n"
          : "The relevant project documentation is provided directly below. Answer ONLY from it, in at most 5 sentences; do not repeat or paste the document, and do NOT call any tool.\n\n") +
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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      await runProfileChat(controller, encoder, systemMessages, history, tools);
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
