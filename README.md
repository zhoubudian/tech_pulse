# Tech Pulse 技术脉搏

每日自动聚合 **GitHub Trending**、**Hacker News**、**掘金** 的热门技术内容，由 AI 生成中文摘要，展示在极简的 Web 页面上。

> 定时任务 → 爬取数据 → AI 生成中文摘要 → 存入数据库 → 前端展示

---

## 技术栈

| 层级   | 技术                      |
| ------ | ------------------------- |
| 框架   | Next.js 14 (App Router)   |
| 语言   | TypeScript                |
| 数据库 | PostgreSQL + Prisma ORM   |
| UI     | Tailwind CSS + Shadcn UI  |
| AI     | DeepSeek-V3 API           |
| 爬取   | Axios + Cheerio + Algolia |
| 部署   | Vercel + Vercel Cron Jobs |

---

## 本地启动

### 环境要求

- Node.js >= 20.9.0
- PostgreSQL（本地或云端均可）

### 1. 克隆项目

```bash
git clone https://github.com/你的用户名/tech-pulse.git
cd tech-pulse
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制模板文件并填入你自己的配置：

```bash
cp .env.example .env
```

打开 `.env` 文件，按说明填入：

```env
# PostgreSQL 连接串
DATABASE_URL="postgresql://用户名:密码@主机:5432/数据库名"

# DeepSeek API Key（阶段2 AI摘要使用）
DEEPSEEK_API_KEY="your_deepseek_api_key"

# Vercel Cron 安全密钥（阶段3部署使用）
CRON_SECRET="your_random_secret"
```

> 💡 没有 DeepSeek Key？前往 [platform.deepseek.com](https://platform.deepseek.com) 注册获取。

### 4. 初始化数据库

```bash
# 执行数据库迁移（自动创建 Article 表）
npx prisma migrate dev --name init

# 生成 Prisma 客户端
npx prisma generate
```

### 5. 运行爬虫（数据采集）

```bash
npm run crawl
```

正常输出示例：

```
========== 开始爬取任务 ==========
[GitHub] 抓取完成，共 13 条
[HackerNews] 抓取完成，共 13 条
[掘金] 抓取完成，共 20 条
========== 任务完成 ==========
数据库总记录数：46 条
```

### 6. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看页面。

---

## 目录结构

```
tech-pulse/
├── app/                    # Next.js App Router 页面
├── lib/
│   └── prisma.ts           # Prisma 客户端单例
├── prisma/
│   ├── schema.prisma       # 数据库模型定义
│   └── migrations/         # 数据库迁移记录
├── scrapers/
│   ├── github.ts           # GitHub Trending 爬虫
│   ├── hackernews.ts       # Hacker News 爬虫（Algolia API）
│   ├── juejin.ts           # 掘金热榜爬虫
│   └── index.ts            # 爬虫主入口（npm run crawl）
├── .env.example            # 环境变量模板
└── prisma.config.ts        # Prisma 数据库配置
```

---

## 数据库模型

```prisma
model Article {
  id          String         @id @default(cuid())
  title       String         // 原始标题
  originalUrl String         @unique
  summary     String?        // AI 生成的中文摘要
  tags        String[]       // 技术标签
  score       Int            @default(0) // 热度分数
  platform    SourcePlatform // GITHUB | HACKER_NEWS | JUEJIN
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}
```

---

## 开发计划

- [x] **阶段 1**：MVP 数据流 — 三平台爬虫 + 数据入库
- [ ] **阶段 2**：AI 自动化 — 接入 DeepSeek，批量生成中文摘要
- [ ] **阶段 3**：前端 UI + 部署 — Shadcn UI 卡片列表 + Vercel Cron 定时任务

---

## 部署到 Vercel

1. 将项目推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入仓库
3. 在 Vercel 控制台配置环境变量（`DATABASE_URL`、`DEEPSEEK_API_KEY`、`CRON_SECRET`）
4. 在 Vercel Dashboard 开启 Cron Jobs，设置每天 08:00 自动运行
