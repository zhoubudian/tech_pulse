import type { Metadata } from "next";
// import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

// const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Tech Pulse 技术脉搏",
  description:
    "每日聚合 GitHub、Hacker News、掘金热门技术内容，AI 生成中文摘要",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className={cn("dark font-sans")}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
