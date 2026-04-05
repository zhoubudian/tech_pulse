import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SourcePlatform } from "@prisma/client";

const PLATFORM_MAP: Record<string, SourcePlatform> = {
  GITHUB: SourcePlatform.GITHUB,
  HACKER_NEWS: SourcePlatform.HACKER_NEWS,
  JUEJIN: SourcePlatform.JUEJIN,
};

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platformParam = searchParams.get("platform")?.toUpperCase();
  const skip = Math.max(0, Number(searchParams.get("skip") ?? 0));
  const take = Math.min(
    50,
    Math.max(1, Number(searchParams.get("take") ?? PAGE_SIZE)),
  );

  const platform = platformParam ? PLATFORM_MAP[platformParam] : undefined;
  const where = platform ? { platform } : undefined;

  try {
    // 多取一条用于判断是否还有更多数据
    const articles = await prisma.article.findMany({
      where,
      orderBy: { score: "desc" },
      skip,
      take: take + 1,
      select: {
        id: true,
        title: true,
        originalUrl: true,
        summary: true,
        tags: true,
        score: true,
        platform: true,
        createdAt: true,
      },
    });

    const hasMore = articles.length > take;
    if (hasMore) articles.pop(); // 移除多取的那一条

    return NextResponse.json({ articles, hasMore });
  } catch (error) {
    console.error("查询文章失败:", error);
    return NextResponse.json({ error: "获取数据失败" }, { status: 500 });
  }
}
