import axios from "axios";
import * as cheerio from "cheerio";

export interface ScrapedItem {
  title: string;
  originalUrl: string;
  description: string;
  score: number;
  tags: string[];
}

export async function scrapeGithubTrending(): Promise<ScrapedItem[]> {
  console.log("[GitHub] 开始抓取 GitHub Trending...");
  // 抓取今日、本周、本月三个榜单，合并去重
  const urls = [
    "https://github.com/trending?since=daily",
    "https://github.com/trending?since=weekly",
  ];
  const allItems: ScrapedItem[] = [];
  const seen = new Set<string>();

  for (const url of urls) {
    const items = await fetchTrendingPage(url);
    for (const item of items) {
      if (!seen.has(item.originalUrl)) {
        seen.add(item.originalUrl);
        allItems.push(item);
      }
    }
  }

  console.log(`[GitHub] 抓取完成，共 ${allItems.length} 条`);
  return allItems;
}

async function fetchTrendingPage(url: string): Promise<ScrapedItem[]> {
  const { data } = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    timeout: 15000,
  });

  const $ = cheerio.load(data);
  const items: ScrapedItem[] = [];

  $("article.Box-row").each((_, el) => {
    const $el = $(el);

    // 项目名：h2 > a，内容类似 "owner / repo"
    const repoPath = $el.find("h2 a").text().replace(/\s+/g, "").trim();
    const repoHref = $el.find("h2 a").attr("href") || "";
    const originalUrl = `https://github.com${repoHref}`;

    // 描述
    const description = $el.find("p").first().text().trim();

    // Star 数：找包含 stars 文本的链接
    const starsText = $el
      .find('a[href$="/stargazers"]')
      .text()
      .replace(/,/g, "")
      .trim();
    const score = parseInt(starsText.replace(/[^0-9]/g, ""), 10) || 0;

    // 编程语言 tag
    const language = $el.find('[itemprop="programmingLanguage"]').text().trim();
    const tags = language ? [language] : [];

    if (repoPath && originalUrl !== "https://github.com") {
      items.push({
        title: repoPath,
        originalUrl,
        description,
        score,
        tags,
      });
    }
  });

  return items;
}
