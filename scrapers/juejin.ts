import axios from "axios";
import type { ScrapedItem } from "./github";

interface JuejinArticleInfo {
  article_id: string;
  article_info: {
    title: string;
    brief_content: string;
    view_count: number;
    digg_count: number;
  };
  tags: Array<{ tag_name: string }>;
}

interface JuejinFeedItem {
  item_type: number;
  item_info: JuejinArticleInfo;
}

interface JuejinResponse {
  data: JuejinFeedItem[];
  err_no: number;
}

export async function scrapeJuejin(): Promise<ScrapedItem[]> {
  console.log("[掘金] 开始抓取掘金热榜...");

  const url =
    "https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed";
  const payload = {
    id_type: 2,
    sort_type: 200,
    ctime: Math.floor(Date.now() / 1000),
    limit: 20,
    client_type: 2608,
  };

  const { data } = await axios.post<JuejinResponse>(url, payload, {
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
    },
    timeout: 15000,
  });

  if (data.err_no !== 0 || !Array.isArray(data.data)) {
    console.warn("[掘金] 接口返回异常:", data.err_no);
    return [];
  }

  const items: ScrapedItem[] = data.data
    .filter(
      (item) =>
        item.item_info &&
        item.item_info.article_id &&
        item.item_info.article_info?.title,
    )
    .map((item) => {
      const articleInfo = item.item_info;
      const info = articleInfo.article_info;
      const tags = (articleInfo.tags || []).map((t) => t.tag_name).slice(0, 3);
      return {
        title: info.title,
        originalUrl: `https://juejin.cn/post/${articleInfo.article_id}`,
        description: info.brief_content || info.title,
        score: info.digg_count || info.view_count || 0,
        tags,
      };
    });

  console.log(`[掘金] 抓取完成，共 ${items.length} 条`);
  return items;
}
