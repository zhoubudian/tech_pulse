import { NextRequest, NextResponse } from "next/server";
import { ChatMessage, parseIntent, streamAnswer } from "@/lib/deepseek";
import { queryArticlesByIntent } from "@/lib/chat";

export async function POST(request: NextRequest) {
  let messages: ChatMessage[];

  try {
    const body = await request.json();
    messages = body.messages;
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages 不能为空" }, { status: 400 });
  }

  try {
    // Step 1: 解析用户意图，提取查询条件
    const intent = await parseIntent(messages);

    // Step 2: 按条件检索数据库
    const articles = await queryArticlesByIntent(intent);

    // Step 3: 流式生成回答
    const stream = await streamAnswer(messages, articles);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Article-Count": String(articles.length),
      },
    });
  } catch (err) {
    console.error("[/api/chat] 处理失败:", err);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
