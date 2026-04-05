import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SourcePlatform } from '@prisma/client'

const PLATFORM_MAP: Record<string, SourcePlatform> = {
  GITHUB: SourcePlatform.GITHUB,
  HACKER_NEWS: SourcePlatform.HACKER_NEWS,
  JUEJIN: SourcePlatform.JUEJIN,
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const platformParam = searchParams.get('platform')?.toUpperCase()

  const platform = platformParam ? PLATFORM_MAP[platformParam] : undefined

  try {
    const articles = await prisma.article.findMany({
      where: platform ? { platform } : undefined,
      orderBy: { score: 'desc' },
      take: 50,
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
    })

    return NextResponse.json(articles)
  } catch (error) {
    console.error('查询文章失败:', error)
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 })
  }
}
