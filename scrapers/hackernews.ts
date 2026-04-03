import axios from 'axios'
import type { ScrapedItem } from './github'

interface HNHit {
  objectID: string
  title: string
  url?: string
  points: number
  story_text?: string
}

interface HNResponse {
  hits: HNHit[]
}

export async function scrapeHackerNews(): Promise<ScrapedItem[]> {
  console.log('[HackerNews] 开始抓取 Hacker News...')

  const since = Math.floor(Date.now() / 1000) - 86400 // 过去24小时
  const apiUrl =
    `https://hn.algolia.com/api/v1/search` +
    `?tags=front_page` +
    `&numericFilters=created_at_i>${since},points>100` +
    `&hitsPerPage=50`

  const { data } = await axios.get<HNResponse>(apiUrl, { timeout: 15000 })

  const items: ScrapedItem[] = data.hits
    .filter((hit) => hit.url) // 过滤掉没有外链的纯讨论帖
    .map((hit) => ({
      title: hit.title,
      originalUrl: hit.url!,
      description: hit.story_text?.replace(/<[^>]+>/g, '').slice(0, 500) || hit.title,
      score: hit.points || 0,
      tags: [],
    }))

  console.log(`[HackerNews] 抓取完成，共 ${items.length} 条`)
  return items
}
