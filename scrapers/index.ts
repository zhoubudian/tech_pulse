import { SourcePlatform } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { scrapeGithubTrending, ScrapedItem } from "./github";
import { scrapeHackerNews } from "./hackernews";
import { scrapeJuejin } from "./juejin";

export async function saveItems(
  items: ScrapedItem[],
  platform: SourcePlatform,
) {
  let saved = 0;
  let skipped = 0;

  for (const item of items) {
    try {
      await prisma.article.upsert({
        where: { originalUrl: item.originalUrl },
        update: {
          score: item.score,
          updatedAt: new Date(),
        },
        create: {
          title: item.title,
          originalUrl: item.originalUrl,
          score: item.score,
          tags: item.tags,
          platform,
        },
      });
      saved++;
    } catch (err) {
      console.warn(
        `[${platform}] 跳过重复或异常记录: ${item.originalUrl}`,
        err,
      );
      skipped++;
    }
  }

  console.log(
    `[${platform}] 入库完成：新增/更新 ${saved} 条，跳过 ${skipped} 条`,
  );
}

async function main() {
  console.log("========== 开始爬取任务 ==========");
  const startTime = Date.now();

  try {
    // 并行抓取三个平台
    const [githubItems, hnItems, juejinItems] = await Promise.allSettled([
      scrapeGithubTrending(),
      scrapeHackerNews(),
      scrapeJuejin(),
    ]);

    // GitHub 入库
    if (githubItems.status === "fulfilled") {
      await saveItems(githubItems.value, SourcePlatform.GITHUB);
    } else {
      console.error("[GitHub] 抓取失败:", githubItems.reason);
    }

    // HackerNews 入库
    if (hnItems.status === "fulfilled") {
      await saveItems(hnItems.value, SourcePlatform.HACKER_NEWS);
    } else {
      console.error("[HackerNews] 抓取失败:", hnItems.reason);
    }

    // 掘金入库
    if (juejinItems.status === "fulfilled") {
      await saveItems(juejinItems.value, SourcePlatform.JUEJIN);
    } else {
      console.error("[掘金] 抓取失败:", juejinItems.reason);
    }

    // 统计总数
    const total = await prisma.article.count();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n========== 任务完成 ==========`);
    console.log(`数据库总记录数：${total} 条`);
    console.log(`耗时：${elapsed}s`);
  } finally {
    await prisma.$disconnect();
  }
}

// 只有直接运行此文件时才自动执行，被 import 时不触发
const argv1 = process.argv[1] ?? "";
if (
  argv1.endsWith("scrapers/index.ts") ||
  argv1.endsWith("scrapers\\index.ts")
) {
  main().catch((err) => {
    console.error("爬取任务异常退出:", err);
    process.exit(1);
  });
}
