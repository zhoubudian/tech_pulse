"use client";

import React, {
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
  memo,
  useMemo,
} from "react";

const ENCRYPTION_KEY = 0xad;

interface Message {
  role: "user" | "assistant";
  content: string;
}

// ─── 优化后的行级渲染器 ─────────────────────────────────────────────────────

/**
 * 解决“吞字”核心逻辑：
 * 只有当匹配符成对出现时才渲染，否则视为普通文本，确保流式传输中途不会消失
 */
const MarkdownRow = memo(({ content }: { content: string }) => {
  const renderInline = (text: string) => {
    // 增加对未闭合语法的保护：如果最后是以 * 或 ` 结尾且不成对，则暂不处理
    return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) => {
      if (!p) return null;
      if (p.startsWith("**") && p.endsWith("**") && p.length >= 4)
        return (
          <strong key={i} className="font-bold text-orange-200">
            {p.slice(2, -2)}
          </strong>
        );
      if (p.startsWith("`") && p.endsWith("`") && p.length >= 2)
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
  };

  // 1. 处理标题 (h1-h3)
  const headerMatch = content.match(/^(#{1,3})\s+(.*)/);
  if (headerMatch) {
    const lv = headerMatch[1].length;
    const cls =
      lv === 3
        ? "text-sm font-semibold mt-2 text-orange-300"
        : "text-sm font-bold mt-3";
    return <div className={cls}>{renderInline(headerMatch[2])}</div>;
  }

  // 2. 处理列表
  if (/^\s*[-*]\s/.test(content)) {
    return (
      <div className="my-0.5 ml-2 flex gap-2">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
        <span className="leading-relaxed">
          {renderInline(content.replace(/^\s*[-*]\s+/, ""))}
        </span>
      </div>
    );
  }

  // 3. 处理表格 (简单预览模式)
  if (content.startsWith("|")) {
    return (
      <div className="my-1 overflow-x-auto font-mono text-xs opacity-75 bg-white/5 p-1 rounded">
        {content}
      </div>
    );
  }

  // 4. 处理空行
  if (!content.trim()) return <div className="h-2" />;

  // 5. 普通段落
  return (
    <p className="my-0.5 leading-relaxed break-words">
      {renderInline(content)}
    </p>
  );
});

MarkdownRow.displayName = "MarkdownRow";

/**
 * 优化后的 Markdown 组件
 * 采用分行渲染策略，配合 React.memo 避免长对话卡顿
 */
const OptimizedMarkdown = memo(({ text }: { text: string }) => {
  const lines = useMemo(() => text.split("\n"), [text]);
  return (
    <div className="text-sm">
      {lines.map((line, i) => (
        <MarkdownRow key={i} content={line} />
      ))}
    </div>
  );
});

OptimizedMarkdown.displayName = "OptimizedMarkdown";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动优化：使用 overflow-anchor 思想，或保持目前的 ScrollIntoView
  useEffect(() => {
    if (streaming) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" }); // 流式传输时用 auto 更丝滑
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streaming]);

  // 自适应高度输入框
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming) return;

    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok || !res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let currentAssistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const decrypted = new Uint8Array(value.length);
        for (let i = 0; i < value.length; i++) {
          decrypted[i] = value[i] ^ ENCRYPTION_KEY;
        }

        const chunk = decoder.decode(decrypted, { stream: true });
        currentAssistantContent += chunk;

        // 使用函数式更新，确保拿到最新的消息数组
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant") {
            return [
              ...prev.slice(0, -1),
              { ...last, content: currentAssistantContent },
            ];
          }
          return prev;
        });
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "抱歉，发生了错误，请重试。" },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed bottom-4 right-4 z-50 flex h-[600px] w-[420px] max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-white/10 bg-neutral-900 shadow-2xl overflow-hidden">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">
                AI 技术助手
              </span>
              <span className="text-[10px] text-neutral-400">
                7x24 在线回复
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => !streaming && setMessages([])}
              className="rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-white/5 hover:text-white disabled:opacity-30"
              disabled={streaming}
            >
              重置
            </button>
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 消息区域 */}
        <div
          className="flex-1 overflow-y-auto p-4 custom-scrollbar"
          style={{ overflowAnchor: "none" }}
        >
          {messages.length === 0 ? (
            <div className="mt-10 flex flex-col items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center text-2xl">
                ⚡
              </div>
              <p className="text-sm text-neutral-400 text-center leading-loose">
                有什么我可以帮你的？
                <br />
                你可以试着问我：
              </p>
              <div className="flex w-full flex-col gap-2">
                {HINTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-lg border border-white/5 bg-white/5 px-3 py-2.5 text-left text-xs text-neutral-300 transition-all hover:bg-white/10 hover:border-white/10"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-2.5 ${
                      m.role === "user"
                        ? "bg-orange-600 text-white shadow-lg shadow-orange-900/10"
                        : "bg-neutral-800 text-neutral-200 border border-white/5"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="relative">
                        <OptimizedMarkdown text={m.content} />
                        {streaming && i === messages.length - 1 && (
                          <span className="inline-block h-4 w-1 ml-1 bg-orange-400 animate-pulse align-middle" />
                        )}
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{m.content}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} className="h-2" />
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="border-t border-white/8 p-4 bg-neutral-900/80">
          <div className="relative flex items-end gap-2 bg-neutral-800 rounded-xl border border-white/10 p-2 focus-within:border-orange-500/50 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="发个消息..."
              rows={1}
              disabled={streaming}
              className="flex-1 max-h-[120px] resize-none bg-transparent px-2 py-1 text-sm text-white placeholder:text-neutral-500 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || streaming}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white transition-all hover:bg-orange-400 disabled:bg-neutral-700 disabled:text-neutral-500"
            >
              {streaming ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 12 7-7 7 7" />
                  <path d="M12 19V5" />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-center text-neutral-500">
            Shift + Enter 换行 · 内容由 AI 生成，仅供技术参考
          </p>
        </div>
      </div>
    </>
  );
}
