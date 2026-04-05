import * as readline from 'readline'
import { SourcePlatform } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { saveItems } from '../scrapers/index'
import { scrapeGithubTrending } from '../scrapers/github'
import { scrapeHackerNews } from '../scrapers/hackernews'
import { scrapeJuejin } from '../scrapers/juejin'

const MENU = `
请选择要爬取的平台：
  1) ALL         - 全部平台
  2) GITHUB      - GitHub Trending
  3) HACKER_NEWS - Hacker News
  4) JUEJIN      - 掘金

请输入序号或平台名称（1/2/3/4 或 ALL/GITHUB/HACKER_NEWS/JUEJIN）：`

const ALIAS: Record<string, string> = {
  '1': 'ALL',
  '2': 'GITHUB',
  '3': 'HACKER_NEWS',
  '4': 'JUEJIN',
  'ALL': 'ALL',
  'GITHUB': 'GITHUB',
  'HACKER_NEWS': 'HACKER_NEWS',
  'JUEJIN': 'JUEJIN',
}

async function runScraper(platform: string) {
  const startTime = Date.now()
  console.log(`\n========== 开始爬取：${platform} ==========`)

  const tasks: Array<{ name: string; fn: () => Promise<unknown[]>; p: SourcePlatform }> = []

  if (platform === 'ALL' || platform === 'GITHUB') {
    tasks.push({ name: 'GitHub', fn: scrapeGithubTrending, p: SourcePlatform.GITHUB })
  }
  if (platform === 'ALL' || platform === 'HACKER_NEWS') {
    tasks.push({ name: 'HackerNews', fn: scrapeHackerNews, p: SourcePlatform.HACKER_NEWS })
  }
  if (platform === 'ALL' || platform === 'JUEJIN') {
    tasks.push({ name: '掘金', fn: scrapeJuejin, p: SourcePlatform.JUEJIN })
  }

  // 并行抓取选中的平台
  const results = await Promise.allSettled(tasks.map((t) => t.fn()))

  for (let i = 0; i < tasks.length; i++) {
    const result = results[i]
    const task = tasks[i]
    if (result.status === 'fulfilled') {
      await saveItems(result.value as Parameters<typeof saveItems>[0], task.p)
    } else {
      console.error(`[${task.name}] 抓取失败:`, result.reason)
    }
  }

  const total = await prisma.article.count()
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n========== 任务完成 ==========`)
  console.log(`数据库总记录数：${total} 条 | 耗时：${elapsed}s`)
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  rl.question(MENU, async (answer) => {
    rl.close()

    const choice = ALIAS[answer.trim().toUpperCase()]

    if (!choice) {
      console.error(`\n❌ 无效选项："${answer}"，请输入 1-4 或平台名称。`)
      process.exit(1)
    }

    try {
      await runScraper(choice)
    } finally {
      await prisma.$disconnect()
    }
  })
}

main().catch((err) => {
  console.error('爬取任务异常退出:', err)
  process.exit(1)
})
