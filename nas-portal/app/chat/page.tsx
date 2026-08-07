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
    const history: ChatMessage[] = [...messages, { role: "user", content: text }];
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
