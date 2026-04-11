import * as readline from "readline";
import { prisma } from "../lib/prisma";
import { ChatMessage, generateAnswer, parseIntent } from "../lib/deepseek";
import { queryArticlesByIntent } from "../lib/chat";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║     🤖 Tech Pulse AI 问答 CLI        ║");
  console.log("╠══════════════════════════════════════╣");
  console.log("║  /new  - 开启新对话（清空历史）      ║");
  console.log("║  exit  - 退出                        ║");
  console.log("╚══════════════════════════════════════╝");
  console.log();

  let messages: ChatMessage[] = [];

  while (true) {
    const input = await ask("你: ");
    const trimmed = input.trim();

    if (!trimmed) continue;

    if (trimmed.toLowerCase() === "exit") {
      console.log("\n再见！👋\n");
      break;
    }

    if (trimmed === "/new") {
      messages = [];
      console.log("\n✅ 已开启新对话，历史记录已清空。\n");
      continue;
    }

    // 将用户消息加入历史
    messages.push({ role: "user", content: trimmed });

    // Step 1: 意图解析
    process.stdout.write("\n🔍 分析问题意图...");
    const intent = await parseIntent(messages);
    console.log(" 完成");
    console.log(
      `   关键词: [${intent.keywords.join(", ") || "无"}]  平台: [${intent.platforms.join(", ") || "全部"}]  时间: ${intent.dateRange === "today" ? "今天" : "全部"}`,
    );

    // Step 2: 数据库检索
    process.stdout.write("📦 检索数据库...");
    const articles = await queryArticlesByIntent(intent);
    console.log(` 检索到 ${articles.length} 条文章`);

    // Step 3: 生成回答（非流式，等待完整结果）
    process.stdout.write("🤖 AI 正在分析...");
    const answer = await generateAnswer(messages, articles);

    if (!answer) {
      console.log("\n⚠️  生成回答失败，请重试。\n");
      // 回退：移除刚加入的用户消息，避免污染历史
      messages.pop();
      continue;
    }

    console.log("\n");
    console.log(`AI:\n${answer}`);
    console.log();

    // 将 AI 回答加入历史，保持多轮上下文
    messages.push({ role: "assistant", content: answer });
  }

  rl.close();
}

main()
  .catch((err) => {
    console.error("\n❌ CLI 异常退出:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
