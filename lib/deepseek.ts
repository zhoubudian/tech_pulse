import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

export interface SummaryResult {
  summary: string;
  tags: string[];
}

// ─── 对话相关类型 ────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface IntentResult {
  keywords: string[];
  platforms: ("GITHUB" | "HACKER_NEWS" | "JUEJIN")[];
  /** today = 仅今天数据；all = 不限时间 */
  dateRange: "today" | "all";
}

export interface ArticleContext {
  title: string;
  summary: string | null;
  tags: string[];
  platform: string;
  score: number;
  originalUrl: string;
}

// ─── 内部工具函数 ─────────────────────────────────────────────────────────────

function buildSystemPrompt(articles: ArticleContext[]): string {
  const date = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const articleList =
    articles.length === 0
      ? "（未检索到相关文章）"
      : articles
          .map(
            (a, i) =>
              `${i + 1}. [${a.platform}] ${a.title}\n   摘要：${a.summary ?? "暂无"}\n   标签：${a.tags.join(", ") || "无"}\n   链接：${a.originalUrl}`,
          )
          .join("\n\n");

  return `你是 Tech Pulse 的 AI 技术助手，今天是 ${date}。
你的任务是帮用户分析和解读从数据库检索到的技术资讯。

当前检索到的相关文章（共 ${articles.length} 条）：
${articleList}

回答规范：
1. 严格基于上方数据进行分析，不捏造数据库中不存在的内容
2. 回答结构清晰，适当使用 Markdown（标题、列表、加粗）
3. 文章较多时按主题分类归纳，突出亮点
4. 若未检索到数据，如实告知并给出建议
5. 语气专业友好，适合技术开发者阅读`;
}

// ─── 对话核心函数 ─────────────────────────────────────────────────────────────

/**
 * 第一阶段：解析用户意图，提取数据库查询条件
 */
export async function parseIntent(
  messages: ChatMessage[],
): Promise<IntentResult> {
  const defaultResult: IntentResult = {
    keywords: [],
    platforms: [],
    dateRange: "today",
  };
  try {
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `你是查询意图解析器。根据用户对话提取查询条件，严格输出以下 JSON，不输出任何其他内容：
{"keywords":[],"platforms":[],"dateRange":"today"}
- keywords: 用户提到的技术关键词，如 ["TypeScript","React","Rust"]，没有则为 []
- platforms: 用户提到的平台，只能从 ["GITHUB","HACKER_NEWS","JUEJIN"] 中选，没有则为 []（代表全部平台）
- dateRange: "today" 表示今天，"all" 表示不限时间；除非用户明确要求历史数据，否则默认 "today"`,
        },
        ...messages
          .slice(-4)
          .map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });
    const content = response.choices[0]?.message?.content;
    if (!content) return defaultResult;
    const parsed = JSON.parse(content) as IntentResult;
    return {
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      platforms: Array.isArray(parsed.platforms) ? parsed.platforms : [],
      dateRange: parsed.dateRange === "all" ? "all" : "today",
    };
  } catch (err) {
    console.error("[DeepSeek] 意图解析失败:", (err as Error).message);
    return defaultResult;
  }
}

/**
 * 第二阶段（非流式）：基于文章数据生成回答，供 CLI 使用
 */
export async function generateAnswer(
  messages: ChatMessage[],
  articles: ArticleContext[],
): Promise<string | null> {
  try {
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: buildSystemPrompt(articles) },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });
    return response.choices[0]?.message?.content ?? null;
  } catch (err) {
    console.error("[DeepSeek] 生成回答失败:", (err as Error).message);
    return null;
  }
}

/**
 * 第二阶段（流式）：基于文章数据生成回答，供 API 路由使用
 */
export async function streamAnswer(
  messages: ChatMessage[],
  articles: ArticleContext[],
): Promise<ReadableStream<Uint8Array>> {
  const stream = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: buildSystemPrompt(articles) },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.7,
    max_tokens: 2048,
    stream: true,
  });
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(encoder.encode(text));
        }
      } finally {
        controller.close();
      }
    },
  });
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
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "你是一个资深全栈开发工程师，擅长提炼技术干货。请严格按照要求输出 JSON，不要输出任何其他内容。",
        },
        {
          role: "user",
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
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as SummaryResult;

    // 基本校验
    if (typeof parsed.summary !== "string" || !Array.isArray(parsed.tags)) {
      console.warn("[DeepSeek] 响应格式异常:", content);
      return null;
    }

    return {
      summary: parsed.summary.trim(),
      tags: parsed.tags.filter((t) => typeof t === "string").slice(0, 3),
    };
  } catch (err) {
    console.error("[DeepSeek] API 调用失败:", (err as Error).message);
    return null;
  }
}
