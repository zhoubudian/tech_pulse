"use client";

import { useEffect, useState } from "react";
import { ArticleCard } from "@/components/article-card";

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

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  // 区分首次加载和 tab 切换：首次用骨架屏，切换 tab 用遮罩
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    setLoading(true);
    const query = activeTab ? `?platform=${activeTab}` : "";
    fetch(`/api/articles${query}`)
      .then((r) => r.json())
      .then((data) => setArticles(Array.isArray(data) ? data : []))
      .finally(() => {
        setLoading(false);
        setInitialLoad(false);
      });
  }, [activeTab]);

  const today = new Date().toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
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
          // 切换 Tab：保留旧内容并整体变暗，避免布局跳动
          <div
            className={`grid grid-cols-1 gap-4 transition-opacity duration-200 md:grid-cols-2 ${
              loading ? "pointer-events-none opacity-40" : "opacity-100"
            }`}
          >
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
