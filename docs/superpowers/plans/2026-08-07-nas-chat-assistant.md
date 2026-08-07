# NAS Chat Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local open-source LLM service (Ollama) and a bilingual chat page so users can ask questions about how this NAS works, answered entirely on-device.

**Architecture:** Ollama runs as a launchd service on the Mac Mini (localhost only), serving a small bilingual model (`qwen3:4b`). The Next.js app exposes `POST /api/chat`, which builds a system prompt from a curated NAS knowledge module (`lib/nas-knowledge.ts`) and streams Ollama's NDJSON output back to the client as plain text. A new `/chat` page renders the conversation with the existing Apple-style design system and i18n.

**Tech Stack:** Ollama (local LLM daemon), Next.js 15 App Router route handler, React 19 client component, Tailwind v4 (existing theme tokens), lucide-react, existing `lib/i18n.ts` locale system.

---

## File Structure

- Create: `lib/nas-knowledge.ts` — bilingual NAS fact store + system-prompt builder
- Create: `app/api/chat/route.ts` — streaming proxy to Ollama
- Create: `app/chat/page.tsx` — chat UI (client component)
- Modify: `lib/i18n.ts` — add `chat` translation keys + `nav.chat` label + type additions
- Modify: `components/top-nav.tsx` — add Chat nav item (desktop + mobile radial menu)
- Create: `~/Library/LaunchAgents/com.nas.ollama.plist` — auto-start Ollama (pattern mirrors `com.nas.portal.plist`)
- Modify: `CHANGELOG.md` — add v3.5 entry

**Environment note:** The repo has **no test framework** (no jest/vitest). Verification is done via `npm run lint`, `next build`, `curl` against the API, and manual browser QA. Tasks use curl-based verification instead of unit tests, matching repo conventions.

---

### Task 1: Install Ollama and serve the model

Ollama is the local LLM daemon. Install via Homebrew, pull the model, and register a launchd agent so it auto-starts (same pattern as `com.nas.portal.plist`).

- [ ] **Step 1: Install Ollama via Homebrew**

```bash
brew install ollama
```

Expected: `brew` completes without error. Then verify the binary path:

```bash
which ollama
```

Expected: `/opt/homebrew/bin/ollama` (Apple Silicon default). Record this path; it goes in the plist.

- [ ] **Step 2: Pull the bilingual model**

```bash
ollama pull qwen3:4b
```

Expected: progress bars, then `success`. Verify with:

```bash
ollama list
```

Expected output includes `qwen3:4b`. (~2.5GB download, may take a few minutes.)

- [ ] **Step 3: Smoke-test the model directly**

```bash
curl -s http://127.0.0.1:11434/api/chat -d '{"model":"qwen3:4b","stream":false,"messages":[{"role":"user","content":"用一句话介绍这个家庭 NAS"}]}'
```

Expected: JSON with a Chinese sentence in `message.content`. (Ollama auto-starts on first request even before launchd is configured.)

- [ ] **Step 4: Create the launchd agent**

Create `~/Library/LaunchAgents/com.nas.ollama.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.nas.ollama</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/ollama</string>
        <string>serve</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>OLLAMA_HOST</key>
        <string>127.0.0.1:11434</string>
    </dict>
    <key>StandardErrorPath</key>
    <string>/tmp/nas.ollama.stderr</string>
    <key>StandardOutPath</key>
    <string>/tmp/nas.ollama.stdout</string>
</dict>
</plist>
```

- [ ] **Step 5: Load the agent and verify**

```bash
launchctl bootout gui/$(id -u)/com.nas.ollama 2>/dev/null; launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.nas.ollama.plist
```

Verify it is running and reachable:

```bash
launchctl print gui/$(id -u)/com.nas.ollama | grep state
curl -s http://127.0.0.1:11434/api/tags
```

Expected: `state = running` and JSON listing `qwen3:4b`.

---

### Task 2: NAS knowledge module

Curates bilingual facts about this specific NAS and builds the system prompt. Source of truth: the existing guide content in `lib/i18n.ts`, `CHANGELOG.md`, `nas-portal-overview.md`, and `app/api/system/status/route.ts`.

**Files:**
- Create: `lib/nas-knowledge.ts`
- Read: `lib/i18n.ts` (guide section) for consistent facts

- [ ] **Step 1: Write `lib/nas-knowledge.ts`**

Create `nas-portal/lib/nas-knowledge.ts` with the exact content below:

```ts
import type { Locale } from "@/lib/i18n";

interface NasFact {
  zh: string;
  en: string;
}

const FACTS: NasFact[] = [
  {
    zh: "这台 NAS 运行在 Mac Mini (Apple M4, 16GB) 上，使用 Next.js 全家桶搭建，是家庭私有云存储中心。",
    en: "This NAS runs on a Mac Mini (Apple M4, 16GB) built with Next.js, and serves as your home private cloud storage hub.",
  },
  {
    zh: "数据存储：一块 3TB WD Red 硬盘，APFS 格式，挂载在 /Volumes/NAS-Data。",
    en: "Storage: a single 3TB WD Red drive formatted APFS, mounted at /Volumes/NAS-Data.",
  },
  {
    zh: "主要页面：概览（仪表盘）、文件、照片、指南、设置、聊天。",
    en: "Main pages: Dashboard, Files, Photos, Guide, Settings, and Chat.",
  },
  {
    zh: "文件页面：可浏览 NAS 上的所有文件、下载、预览；视频支持在线播放（MP4/WebM，支持 HTTP Range 流式传输）；图片/文件有缩略图。",
    en: "Files page: browse all files on the NAS, download and preview; videos play inline (MP4/WebM with HTTP Range streaming); images and files show thumbnails.",
  },
  {
    zh: "照片页面：照片按 EXIF 拍摄时间自动整理成按月分组的时间线，支持 JPEG/HEIC/PNG/RAW，HEIC 会自动转换为可预览格式。",
    en: "Photos page: photos are auto-organized into a monthly timeline by EXIF capture date; supports JPEG/HEIC/PNG/RAW; HEIC is auto-converted for preview.",
  },
  {
    zh: "SMB 访问：同一 WiFi 下，在 Finder (Mac) 或「此电脑」(Windows) 地址栏输入 smb://192.168.1.46 或 smb://nas.local 即可像本地硬盘一样访问。删除不可恢复，请谨慎。",
    en: "SMB access: on the same WiFi, type smb://192.168.1.46 or smb://nas.local into Finder (Mac) or This PC (Windows) to access files like a local drive. Deleted files cannot be recovered.",
  },
  {
    zh: "远程访问：通过 Cloudflare Tunnel 在 https://nas.elevenbeans.me 访问；也可用 Tailscale 从任何地方安全访问。",
    en: "Remote access: reachable at https://nas.elevenbeans.me via Cloudflare Tunnel; Tailscale is also available for secure access from anywhere.",
  },
  {
    zh: "版权限制：Movies 目录（影视文件）在外网访问时只能看到文件名和大小，不能预览/播放/下载；需在内网（同一 WiFi）才能获得完整功能。",
    en: "Copyright restriction: the Movies folder (movie files) is limited to name and size over the external network — no preview/play/download; full functionality requires the home network (same WiFi).",
  },
  {
    zh: "存储方案建议：重要且需要共享的数据 → NAS + Local 双备份；只需共享 → NAS；重要但不共享 → Local 自备份；其他 → Local。",
    en: "Storage plan advice: important + shareable → NAS + Local dual backup; shareable only → NAS; important only → Local with self backup; everything else → Local.",
  },
  {
    zh: "语言：页面右上角可切换 中文 / English。",
    en: "Language: toggle 中文 / English at the top-right of the page.",
  },
  {
    zh: "常见问题：忘记管理员密码请联系管理员重置；扩展存储需插入新硬盘并联系管理员；误删文件目前无法恢复（无回收站），删除前请确认。",
    en: "FAQ: contact the admin to reset a forgotten password; expanding storage requires a new drive and admin setup; accidentally deleted files cannot be recovered (no trash), so confirm before deleting.",
  },
];

export function buildSystemPrompt(locale: Locale): string {
  const facts = FACTS.map((f) => (locale === "zh" ? f.zh : f.en)).join("\n");
  const header =
    locale === "zh"
      ? "你是「家庭 NAS 助手」，负责回答用户关于这台家庭 NAS 的使用问题。回答请用中文，简洁、友好，必要时分点列出。只依据下方已知事实回答；如果问题超出事实范围，请如实说明你不知道，不要编造。已知事实如下："
      : "You are the 'Home NAS Assistant', answering questions about how to use this home NAS. Reply in English, concise and friendly, using bullet points when helpful. Answer only based on the facts below; if a question is outside them, say you don't know instead of making things up. Known facts:";
  return `${header}\n${facts}`;
}
```

- [ ] **Step 2: Verify the module compiles**

Run TypeScript check (no test framework exists in this repo):

```bash
npx tsc --noEmit
```

Expected: exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add nas-portal/lib/nas-knowledge.ts
git commit -m "feat: add NAS knowledge module for chat assistant"
```

---

### Task 3: Chat API route

Streams Ollama's response to the client. Uses `api/chat` (NDJSON streaming) at `http://127.0.0.1:11434`, transforms to plain-text stream.

**Files:**
- Create: `app/api/chat/route.ts`

- [ ] **Step 1: Write `app/api/chat/route.ts`**

Create `nas-portal/app/api/chat/route.ts`:

```ts
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
```

- [ ] **Step 2: Verify the route compiles**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Test the route end-to-end (dev server)**

Start dev server in one terminal:

```bash
npm run dev
```

In another terminal:

```bash
curl -s -N http://localhost:3001/api/chat -H "Content-Type: application/json" -d '{"locale":"zh","messages":[{"role":"user","content":"如何通过 SMB 访问 NAS？"}]}'
```

Expected: a streamed Chinese answer about SMB access ending with a newline. Also test English:

```bash
curl -s -N http://localhost:3001/api/chat -H "Content-Type: application/json" -d '{"locale":"en","messages":[{"role":"user","content":"How do I connect over SMB?"}]}'
```

Expected: an English answer. Kill the dev server after testing.

- [ ] **Step 4: Commit**

```bash
git add nas-portal/app/api/chat/route.ts
git commit -m "feat: add streaming chat API backed by local Ollama"
```

---

### Task 4: Chat page UI

Client component page at `/chat`, matching the Apple-clean design system used across the app (white `rounded-[20px]` cards, `text-apple-*` colors, `font-heading`).

**Files:**
- Create: `app/chat/page.tsx`
- Modify: `lib/i18n.ts` (add `chat` + `nav.chat` keys)

- [ ] **Step 1: Add i18n keys**

In `nas-portal/lib/i18n.ts`:

1. In the top-level type object (the `Record<Locale, {...}>`), add `chat` to the object type and `chat` to `nav`. The `nav` field is typed `Record<string, string>` so it already accepts a new key. For `chat`, add a new field in the type literal:

```ts
  chat: {
    title: string;
    subtitle: string;
    placeholder: string;
    send: string;
    thinking: string;
    errorOffline: string;
    error: string;
    you: string;
    assistant: string;
  };
```

2. In the `zh` block, after the `settings` entry, add:

```ts
    chat: {
      title: "NAS 助手",
      subtitle: "询问任何关于这台 NAS 的问题，由本地 AI 回答",
      placeholder: "输入你的问题…",
      send: "发送",
      thinking: "思考中…",
      errorOffline: "本地 AI 服务未启动，请稍后再试。",
      error: "出错了，请重试。",
      you: "你",
      assistant: "助手",
    },
```

3. In the `zh` block's `nav`, add `chat: "助手",` after `settings`.

4. In the `en` block, after the `settings` entry, add:

```ts
    chat: {
      title: "NAS Assistant",
      subtitle: "Ask anything about this NAS — answered by a local AI",
      placeholder: "Type your question…",
      send: "Send",
      thinking: "Thinking…",
      errorOffline: "Local AI service is offline. Please try again later.",
      error: "Something went wrong. Please retry.",
      you: "You",
      assistant: "Assistant",
    },
```

5. In the `en` block's `nav`, add `chat: "Chat",` after `settings`.

- [ ] **Step 2: Write `app/chat/page.tsx`**

Create `nas-portal/app/chat/page.tsx`:

```tsx
"use client";

import { useRef, useState, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/language-toggle";
import { locales } from "@/lib/i18n";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const WELCOME: Record<"zh" | "en", string> = {
  zh: "你好！我是 NAS 助手。你可以问我文件、照片、远程访问、SMB 使用等任何问题。",
  en: "Hi! I'm the NAS Assistant. Ask me anything about files, photos, remote access, SMB usage, and more.",
};

export default function ChatPage() {
  const { locale } = useLanguage();
  const t = locales[locale].chat;
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: WELCOME[locale] },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError("");
    const history = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, locale }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setError(data?.error ? t.errorOffline : t.error);
        setMessages([...history]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
      }
    } catch {
      setError(t.error);
      setMessages([...history]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 pt-10 pb-20">
      <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-1">{t.title}</h1>
      <p className="text-[15px] text-apple-muted mb-8">{t.subtitle}</p>

      <div className="flex flex-col gap-4 mb-6">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                msg.role === "user" ? "bg-clean-blue text-white" : "bg-[#f5f5f7] text-clean-blue"
              }`}
            >
              {msg.role === "user" ? <User className="w-[18px] h-[18px]" /> : <Bot className="w-[18px] h-[18px]" />}
            </div>
            <div
              className={`max-w-[85%] rounded-[20px] px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap break-words ${
                msg.role === "user"
                  ? "bg-clean-blue text-white rounded-tr-[6px]"
                  : "bg-white text-apple-text rounded-tl-[6px]"
              }`}
            >
              {msg.content}
              {msg.role === "assistant" && loading && i === messages.length - 1 && msg.content === "" && (
                <Loader2 className="w-4 h-4 animate-spin text-apple-muted" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="text-[13px] text-red-500 mb-3 px-1">{error}</div>
      )}

      <div className="bg-white rounded-[20px] p-3 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
          placeholder={t.placeholder}
          disabled={loading}
          className="flex-1 min-w-0 bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-apple-muted disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-xl bg-clean-blue text-white flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-40 disabled:pointer-events-none"
          aria-label={t.send}
        >
          <Send className="w-[18px] h-[18px]" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add the nav entry in `components/top-nav.tsx`**

In the import line, add `MessageCircle` to the lucide-react import:

```tsx
import { LayoutDashboard, FolderOpen, Image, Settings, BookOpen, X, Compass, MessageCircle } from "lucide-react";
```

In `navItems`, add the Chat item (after Settings):

```tsx
    { href: "/chat", label: locales[locale].nav.chat, icon: MessageCircle },
```

- [ ] **Step 4: Verify types + build**

```bash
npx tsc --noEmit && npm run build
```

Expected: exit 0; `next build` succeeds and prints routes including `/chat` and `/api/chat`.

- [ ] **Step 5: Commit**

```bash
git add nas-portal/app/chat/page.tsx nas-portal/lib/i18n.ts nas-portal/components/top-nav.tsx
git commit -m "feat: add bilingual chat page with streaming assistant UI"
```

---

### Task 5: Manual QA and ship

- [ ] **Step 1: Manual browser QA**

Start the app and test in a browser (or via `curl`/QA skill):

1. `npm run dev`, open `http://localhost:3001/chat`
2. Ask "如何通过 SMB 访问 NAS？" — expect a Chinese streaming answer.
3. Switch to English (top-right toggle), ask "How do I access my photos?" — expect English answer.
4. Open mobile viewport — verify bubbles wrap, input+send button usable, radial menu now shows "助手"/"Chat" item.
5. Verify the `/files`, `/photos`, `/` pages still render (nav regression check).

- [ ] **Step 2: Update CHANGELOG.md**

In `/Users/elevenbeans/code/nas/CHANGELOG.md`, append after the v3.4 section:

```markdown
## v3.5 (2026-08-07)

- **Local AI assistant** — `/chat` page with a bilingual streaming chat interface answering questions about how this NAS works
- **Local LLM service** — Ollama serving `qwen3:4b` on-device (launchd auto-start), no cloud dependency or data leaving the NAS
- **Knowledge-grounded answers** — system prompt built from curated NAS facts (`lib/nas-knowledge.ts`) covering files, photos, SMB, remote access, storage plans, and copyright restrictions
```

- [ ] **Step 3: Commit and verify build**

```bash
git add /Users/elevenbeans/code/nas/CHANGELOG.md
git commit -m "chore: v3.5 — local AI chat assistant for NAS usage questions"
npm run build
```

Expected: build succeeds. If the user wants to deploy, run `npm run sync` to rebuild + restart the LaunchAgent + purge CF cache (ask first).

---

## Self-Review

**Spec coverage:** (1) local open-source LLM service → Task 1 (Ollama, launchd). (2) chat UI → Task 4. (3) answers questions about how this NAS works → Task 2 knowledge module + Task 3 API. All three requirements covered.

**Placeholder scan:** All steps contain complete code and exact commands; no TODOs.

**Type consistency:** `ClientMessage` role typed `"user" | "assistant"` in Task 3 matches `ChatMessage` in Task 4. `buildSystemPrompt(locale: Locale)` matches its call site. `OLLAMA_URL`/`OLLAMA_MODEL` env defaults consistent. `nav.chat` matches `locales[locale].nav.chat` usage. i18n `chat.*` keys match all usages in Task 4 Step 2 (`title`, `subtitle`, `placeholder`, `send`, `errorOffline`, `error`).
