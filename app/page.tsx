"use client";

import { useEffect, useRef, useState } from "react";
import { ArticleCard } from "@/components/article-card";
import { ChatPanel } from "@/components/chat-panel";

type Platform = "GITHUB" | "HACKER_NEWS" | "JUEJIN";

interface Article {
  id: string;
  title: string;
  originalUrl: string;
  summary: string | null;
  tags: string[];
  score: number;
  platform: Platform;
  createdAt: string;
}

const TABS = [
  { label: "全部", value: "" },
  { label: "GitHub", value: "GITHUB" },
  { label: "HN", value: "HACKER_NEWS" },
  { label: "掘金", value: "JUEJIN" },
];

const PAGE_SIZE = 20;

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true); // 首次 / tab 切换
  const [loadingMore, setLoadingMore] = useState(false); // 滚动加载更多
  const [initialLoad, setInitialLoad] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 切换 Tab 时重置分页状态
  useEffect(() => {
    setArticles([]);
    setSkip(0);
    setHasMore(true);
    setLoading(true);
    setInitialLoad(true);
  }, [activeTab]);

  // 根据 skip 变化请求数据
  useEffect(() => {
    const isFirst = skip === 0;
    if (!isFirst) setLoadingMore(true);

    const params = new URLSearchParams({
      skip: String(skip),
      take: String(PAGE_SIZE),
    });
    if (activeTab) params.set("platform", activeTab);

    fetch(`/api/articles?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.articles) return;
        setArticles((prev) =>
          isFirst ? data.articles : [...prev, ...data.articles],
        );
        setHasMore(data.hasMore);
      })
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
        setInitialLoad(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, activeTab]);

  // IntersectionObserver：sentinel 进入视口时加载下一页
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setSkip((prev) => prev + PAGE_SIZE);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading]);

  const today = new Date().toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* AI 对话面板 */}
      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />

      {/* 悬浮 AI 按钮 */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          title="AI 问答"
          className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-card text-xl shadow-lg transition-all duration-200 hover:border-orange-400 hover:scale-110"
        >
          🤖
        </button>
      )}
      {/* 顶部加载进度条 */}
      <div
        className={`fixed left-0 top-0 z-50 h-0.5 bg-orange-400 transition-all duration-300 ${
          loading && !initialLoad ? "w-3/4 opacity-100" : "w-0 opacity-0"
        }`}
      />

      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-10 border-b border-white/8 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-lg font-bold text-foreground">
            <span className="text-orange-400">⚡</span>
            <span>Tech Pulse</span>
            <span className="text-muted-foreground">技术脉搏</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-sm text-muted-foreground">
            <span>📅</span>
            <span>{today}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Tab 筛选 */}
        <div className="mb-8 flex gap-1 border-b border-white/8">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 pb-3 pt-1 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? "border-b-2 border-orange-400 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              [{tab.label}]
            </button>
          ))}
        </div>

        {/* 文章网格 */}
        {initialLoad && loading ? (
          // 首次加载：骨架屏
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-lg bg-card" />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            暂无数据
          </div>
        ) : (
          <>
            {/* 切换 Tab：保留旧内容并整体变暗，避免布局跳动 */}
            <div
              className={`grid grid-cols-1 gap-4 transition-opacity duration-200 md:grid-cols-2 ${
                loading ? "pointer-events-none opacity-40" : "opacity-100"
              }`}
            >
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>

            {/* 滚动加载更多：骨架占位 */}
            {loadingMore && (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-48 animate-pulse rounded-lg bg-card"
                  />
                ))}
              </div>
            )}

            {/* sentinel：进入视口时触发加载下一页 */}
            <div ref={sentinelRef} className="h-4" />

            {/* 没有更多数据时的提示 */}
            {!hasMore && articles.length > 0 && (
              <p className="mt-6 text-center text-xs text-muted-foreground">
                — 已加载全部 {articles.length} 条 —
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
