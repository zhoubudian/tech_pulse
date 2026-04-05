import { prisma } from '../lib/prisma'
import { summarizeArticle } from '../lib/deepseek'

// 每批处理的数量，避免并发过多触发限流
const BATCH_SIZE = 5
// 每条请求之间的间隔（ms），DeepSeek 免费额度有 RPM 限制
const DELAY_MS = 500

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  console.log('========== 开始 AI 摘要任务 ==========')

  // 查询所有 summary 为空的记录
  const pending = await prisma.article.findMany({
    where: { summary: null },
    select: { id: true, title: true, platform: true },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`待处理记录：${pending.length} 条`)

  if (pending.length === 0) {
    console.log('所有记录已有摘要，无需处理。')
    return
  }

  let success = 0
  let failed = 0

  // 分批处理
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE)
    console.log(
      `\n处理批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(pending.length / BATCH_SIZE)}（${batch.length} 条）`,
    )

    await Promise.all(
      batch.map(async (article) => {
        const result = await summarizeArticle(article.title, article.title)

        if (result) {
          await prisma.article.update({
            where: { id: article.id },
            data: {
              summary: result.summary,
              // 合并已有 tags（爬虫抓到的语言标签）与 AI 生成的标签，去重
              tags: { set: [...new Set(result.tags)] },
            },
          })
          console.log(`  ✅ [${article.platform}] ${article.title.slice(0, 40)}`)
          success++
        } else {
          console.warn(`  ❌ [${article.platform}] ${article.title.slice(0, 40)}`)
          failed++
        }
      }),
    )

    // 批次间等待，避免限流
    if (i + BATCH_SIZE < pending.length) {
      await sleep(DELAY_MS)
    }
  }

  // 汇总
  const total = await prisma.article.count({ where: { summary: { not: null } } })
  console.log(`\n========== 任务完成 ==========`)
  console.log(`成功：${success} 条 | 失败：${failed} 条`)
  console.log(`数据库中已有摘要的记录总数：${total} 条`)
}

main()
  .catch((err) => {
    console.error('摘要任务异常退出:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
