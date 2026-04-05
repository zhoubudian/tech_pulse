'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Platform = 'GITHUB' | 'HACKER_NEWS' | 'JUEJIN'

interface Article {
  id: string
  title: string
  originalUrl: string
  summary: string | null
  tags: string[]
  score: number
  platform: Platform
}

const PLATFORM_LABEL: Record<Platform, string> = {
  GITHUB: 'GitHub',
  HACKER_NEWS: 'Hacker News',
  JUEJIN: '掘金',
}

const PLATFORM_COLOR: Record<Platform, string> = {
  GITHUB: 'bg-blue-600 text-white hover:bg-blue-600',
  HACKER_NEWS: 'bg-orange-600 text-white hover:bg-orange-600',
  JUEJIN: 'bg-blue-500 text-white hover:bg-blue-500',
}

function parseBullets(summary: string | null): string[] {
  if (!summary) return []
  return summary
    .split('•')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 3)
}

export function ArticleCard({ article }: { article: Article }) {
  const bullets = parseBullets(article.summary)

  return (
    <Card className="border border-white/8 bg-card transition-colors hover:border-white/15 hover:bg-card/80">
      <CardContent className="p-5">
        {/* 标题行 */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <a
            href={article.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2"
          >
            <span className="mt-0.5 shrink-0 text-base">🔥</span>
            <h2 className="text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-orange-400">
              {article.title}
            </h2>
          </a>
          <Badge className={`shrink-0 text-xs ${PLATFORM_COLOR[article.platform]}`}>
            {PLATFORM_LABEL[article.platform]}
          </Badge>
        </div>

        {/* 摘要要点 */}
        {bullets.length > 0 && (
          <ul className="mb-4 space-y-1.5">
            {bullets.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                <span className="leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        )}

        {/* 底部：标签 + 分数 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {article.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-white/8 px-2 py-0.5 text-xs text-muted-foreground hover:bg-white/12"
              >
                {tag}
              </Badge>
            ))}
          </div>
          {article.score > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-xs text-amber-400">
              <span>★</span>
              <span>{article.score.toLocaleString()}</span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
