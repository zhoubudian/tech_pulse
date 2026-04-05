import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

export interface SummaryResult {
  summary: string
  tags: string[]
}

/**
 * 调用 DeepSeek 对单条文章生成中文摘要和标签
 */
export async function summarizeArticle(
  title: string,
  description: string,
): Promise<SummaryResult | null> {
  try {
    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content:
            '你是一个资深全栈开发工程师，擅长提炼技术干货。请严格按照要求输出 JSON，不要输出任何其他内容。',
        },
        {
          role: 'user',
          content: `标题: ${title}
内容描述: ${description}

任务：
1. 将内容翻译为简洁的中文，提取 3 个核心价值点（用 • 分隔）。
2. 归纳 1-2 个技术标签（如 React、Rust、AI 等）。
3. 严格输出以下 JSON 格式，不要有多余文字：
{"summary":"...","tags":["...","..."]}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 512,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content) as SummaryResult

    // 基本校验
    if (typeof parsed.summary !== 'string' || !Array.isArray(parsed.tags)) {
      console.warn('[DeepSeek] 响应格式异常:', content)
      return null
    }

    return {
      summary: parsed.summary.trim(),
      tags: parsed.tags.filter((t) => typeof t === 'string').slice(0, 3),
    }
  } catch (err) {
    console.error('[DeepSeek] API 调用失败:', (err as Error).message)
    return null
  }
}
