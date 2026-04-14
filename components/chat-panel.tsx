"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// ─── 简易 Markdown 渲染器 ─────────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`"))
      return (
        <code
          key={i}
          className="rounded bg-white/10 px-1 font-mono text-xs text-orange-300"
        >
          {p.slice(1, -1)}
        </code>
      );
    return p;
  });
}

function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^#{1,3} /.test(l)) {
      const lv = l.match(/^(#+)/)![1].length;
      const cls =
        lv === 3
          ? "text-sm font-semibold mt-2 text-orange-300"
          : "text-sm font-bold mt-3";
      nodes.push(
        <div key={i} className={cls}>
          {renderInline(l.replace(/^#+\s/, ""))}
        </div>,
      );
    } else if (/^\s*[-*]\s/.test(l)) {
      nodes.push(
        <div key={i} className="my-0.5 ml-2 flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
          <span className="leading-relaxed">
            {renderInline(l.replace(/^\s*[-*]\s+/, ""))}
          </span>
        </div>,
      );
    } else if (l.startsWith("|")) {
      const tb = [l];
      while (i + 1 < lines.length && lines[i + 1].startsWith("|"))
        tb.push(lines[++i]);
      nodes.push(
        <pre
          key={i}
          className="my-2 overflow-x-auto font-mono text-xs opacity-75"
        >
          {tb.join("\n")}
        </pre>,
      );
    } else if (!l.trim()) {
      nodes.push(<div key={i} className="h-1.5" />);
    } else {
      nodes.push(
        <p key={i} className="my-0.5 leading-relaxed">
          {renderInline(l)}
        </p>,
      );
    }
    i++;
  }
  return <div className="text-sm">{nodes}</div>;
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────

const HINTS = [
  "今天有什么技术咨询？",
  "GitHub 上有什么热门项目？",
  "有哪些关于 AI 的资讯？",
];

export function ChatPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        setMessages((p) => {
          const l = p[p.length - 1];
          return [...p.slice(0, -1), { ...l, content: l.content + chunk }];
        });
      }
    } catch {
      setMessages((p) => {
        const l = p[p.length - 1];
        return [
          ...p.slice(0, -1),
          { ...l, content: "抱歉，发生了错误，请重试。" },
        ];
      });
    } finally {
      setStreaming(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 对话面板 */}
      <div className="fixed bottom-4 right-4 z-50 flex h-[600px] w-[420px] max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-white/10 bg-background shadow-2xl">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <div className="flex items-center gap-2">
            <span>🤖</span>
            <span className="text-sm font-semibold">AI 问答</span>
            <span className="text-xs text-muted-foreground">
              · 基于今日数据库
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (!streaming) {
                  setMessages([]);
                  setInput("");
                }
              }}
              disabled={streaming}
              className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground disabled:opacity-40"
            >
              新对话
            </button>
            <button
              onClick={onClose}
              className="ml-1 rounded p-1 text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-4 text-center">
              <p className="text-3xl">⚡</p>
              <p className="text-sm text-muted-foreground">
                基于今日抓取的技术资讯
                <br />向 AI 提问任何问题
              </p>
              <div className="flex w-full flex-col gap-2">
                {HINTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-lg border border-white/8 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-white/15 hover:bg-white/5 hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 ${
                      m.role === "user" ? "bg-orange-500/20" : "bg-white/5"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <>
                        <SimpleMarkdown text={m.content} />
                        {streaming && i === messages.length - 1 && (
                          <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-orange-400" />
                        )}
                      </>
                    ) : (
                      <p className="text-sm">{m.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 输入框 */}
        <div className="border-t border-white/8 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="问点什么…（Enter 发送，Shift+Enter 换行）"
              rows={1}
              disabled={streaming}
              className="flex-1 resize-none rounded-lg bg-white/5 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50"
              style={{ maxHeight: "120px", overflowY: "auto" }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || streaming}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white transition-colors hover:bg-orange-400 disabled:opacity-40"
            >
              {streaming ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "↑"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
