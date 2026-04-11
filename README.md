# Tech Pulse 技术脉搏

每日自动聚合 **GitHub Trending**、**Hacker News**、**掘金** 的热门技术内容，由 AI 生成中文摘要，展示在极简的深色 Web 页面上。支持 **AI 问答**，用自然语言向 AI 提问，基于数据库实时分析回答。

```
定时任务 → 爬取三平台数据 → DeepSeek AI 生成摘要 → 存入 PostgreSQL → 前端展示
                                                                         └─► AI 问答：意图解析 → 数据检索 → 流式回答
```

---

## 技术栈

| 层级   | 技术                                                        |
| ------ | ----------------------------------------------------------- |
| 框架   | Next.js 14 (App Router)                                     |
| 语言   | TypeScript                                                  |
| 数据库 | PostgreSQL + Prisma ORM + `@prisma/adapter-pg`              |
| UI     | Tailwind CSS + Shadcn UI                                    |
| AI     | DeepSeek-V3 API（兼容 OpenAI 格式），用于摘要生成与 AI 问答 |
| 爬取   | Axios + Cheerio（GitHub）+ Algolia API（HN）+ 掘金接口      |
| 运行时 | Node.js >= 20.9.0，tsx 直接运行 TypeScript                  |
| 部署   | Vercel + Vercel Cron Jobs                                   |

---

## 快速开始

### 1. 克隆并安装依赖

```bash
git clone https://github.com/你的用户名/tech-pulse.git
cd tech-pulse
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入以下三个值：

```env
# PostgreSQL 连接串
DATABASE_URL="postgresql://用户名:密码@主机:5432/tech_pulse"

# DeepSeek API Key —— 前往 https://platform.deepseek.com 获取
DEEPSEEK_API_KEY="sk-xxxxxxxxxxxxxxxx"

# Vercel Cron 鉴权密钥（部署时使用，本地可随意填写）
CRON_SECRET="your_random_secret"
```

### 3. 初始化数据库

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. 采集数据 + AI 摘要（一键完成）

```bash
npm run pipeline
```

或者按需选择平台单独爬取：

```bash
npm run crawl:select
# 交互式菜单：选择 ALL / GITHUB / HACKER_NEWS / JUEJIN
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

---

## 所有可用命令

| 命令                   | 说明                               |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | 启动本地开发服务器                 |
| `npm run build`        | 构建生产包                         |
| `npm run crawl`        | 爬取全部三个平台并入库             |
| `npm run crawl:select` | 交互式选择平台爬取                 |
| `npm run summarize`    | 对数据库中无摘要的记录批量调用 AI  |
| `npm run pipeline`     | `crawl` + `summarize` 一键顺序执行 |
| `npm run chat`         | 在终端中与 AI 进行多轮问答（CLI）  |

---

## 目录结构

```
tech-pulse/
├── app/
│   ├── api/articles/route.ts   # 分页查询接口（支持 skip / take / platform）
│   ├── api/chat/route.ts       # AI 问答接口（意图解析 → 数据检索 → 流式回答）
│   ├── globals.css             # 深海军蓝主题 CSS 变量
│   ├── layout.tsx              # 根布局，全局 dark 模式
│   └── page.tsx                # 首页：Tab 筛选 + 滚动加载卡片列表
├── components/
│   ├── article-card.tsx        # 文章卡片组件
│   └── ui/                     # Shadcn UI 基础组件
├── lib/
│   ├── deepseek.ts             # DeepSeek API 封装（摘要、意图解析、流式对话）
│   ├── chat.ts                 # AI 问答数据库查询逻辑（按意图检索文章）
│   ├── prisma.ts               # Prisma 客户端单例（含 pg adapter）
│   └── utils.ts                # Tailwind 工具函数
├── prisma/
│   ├── schema.prisma           # 数据模型定义
│   └── migrations/             # 数据库迁移文件
├── scrapers/
│   ├── github.ts               # GitHub Trending 爬虫
│   ├── hackernews.ts           # HN 爬虫（Algolia API）
│   ├── juejin.ts               # 掘金热榜爬虫
│   └── index.ts                # 全量爬取入口（npm run crawl）
├── scripts/
│   ├── crawl-select.ts         # 交互式平台选择爬取
│   ├── summarize.ts            # AI 批量摘要脚本
│   └── chat.ts                 # AI 问答 CLI（多轮对话，/new 开启新对话）
├── .env.example                # 环境变量模板
└── prisma.config.ts            # Prisma 数据库连接配置
```

---

## 数据模型

```prisma
enum SourcePlatform { GITHUB  HACKER_NEWS  JUEJIN }

model Article {
  id          String         @id @default(cuid())
  title       String
  originalUrl String         @unique
  summary     String?        @db.Text   // AI 生成的中文摘要（3 个核心要点）
  tags        String[]                  // 技术标签，如 ["React", "TypeScript"]
  score       Int            @default(0) // 热度分数（Star 数 / 点赞数）
  platform    SourcePlatform
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@index([platform, createdAt])
}
```

---

## 分页 API

```
GET /api/articles?platform=GITHUB&skip=0&take=20
```

| 参数       | 类型   | 默认值 | 说明                                |
| ---------- | ------ | ------ | ----------------------------------- |
| `platform` | string | —      | `GITHUB` / `HACKER_NEWS` / `JUEJIN` |
| `skip`     | number | `0`    | 跳过条数                            |
| `take`     | number | `20`   | 每页条数（最大 50）                 |

**响应格式**

```json
{
  "articles": [...],
  "hasMore": true
}
```

---

## AI 问答 API

```
POST /api/chat
Content-Type: application/json
```

**请求体**

```json
{
  "messages": [
    { "role": "user", "content": "今天有什么咨询？" },
    { "role": "assistant", "content": "今天共收录了..." },
    { "role": "user", "content": "有哪些关于 TypeScript 的？" }
  ]
}
```

**处理流程**

1. **意图解析** — DeepSeek 从对话中提取查询条件（关键词、平台、时间范围）
2. **数据检索** — 按条件查询 PostgreSQL，默认只查今天的数据，最多返回 30 条
3. **流式回答** — 将文章列表 + 完整对话历史交给 DeepSeek，以 `text/plain` 流式返回

**响应**：`Content-Type: text/plain; charset=utf-8`（流式，打字机效果）

---

## 部署到 Vercel

1. 将项目推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入仓库
3. 在 Vercel 控制台的 **Environment Variables** 中添加：
   - `DATABASE_URL`
   - `DEEPSEEK_API_KEY`
   - `CRON_SECRET`
4. 在 `vercel.json` 中配置 Cron Job，每天 08:00 自动触发数据更新

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 0 * * *"
    }
  ]
}
```
