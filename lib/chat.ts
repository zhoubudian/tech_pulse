import { Prisma, SourcePlatform } from "@prisma/client";
import { ArticleContext, IntentResult } from "./deepseek";
import { prisma } from "./prisma";

/**
 * 根据意图解析结果从数据库检索相关文章
 * - dateRange: today  → 仅查今天数据
 * - platforms: 非空   → 按平台过滤
 * - keywords: 非空    → 在标题 / 摘要中模糊匹配，在 tags 中精确匹配
 */
export async function queryArticlesByIntent(
  intent: IntentResult,
): Promise<ArticleContext[]> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const where: Prisma.ArticleWhereInput = {};

  if (intent.dateRange === "today") {
    where.createdAt = { gte: todayStart };
  }

  if (intent.platforms.length > 0) {
    where.platform = { in: intent.platforms as SourcePlatform[] };
  }

  if (intent.keywords.length > 0) {
    where.OR = intent.keywords.flatMap((k) => [
      { title: { contains: k, mode: "insensitive" } },
      { summary: { contains: k, mode: "insensitive" } },
      { tags: { has: k } },
    ]);
  }

  const articles = await prisma.article.findMany({
    where,
    orderBy: { score: "desc" },
    take: 30,
    select: {
      title: true,
      summary: true,
      tags: true,
      platform: true,
      score: true,
      originalUrl: true,
    },
  });

  return articles;
}
