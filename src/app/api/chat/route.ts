import { deepseek } from "@ai-sdk/deepseek";
import { streamText } from "ai";
import { NextResponse } from "next/server";
import { generateEmbedding } from "@/lib/embedding";
import { createClient } from "@supabase/supabase-js";

/**
 * 创建 Supabase 管理员客户端
 */
function getAdminSupabase() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !supabaseServiceKey) {
		throw new Error("缺少 Supabase 环境变量");
	}

	return createClient(supabaseUrl, supabaseServiceKey);
}

interface DocumentChunk {
	id: number;
	content: string;
	similarity: number;
}

interface ChatMessage {
	role: "user" | "assistant";
	content: string;
}

/**
 * 搜索相关的文档分块
 */
async function searchRelevantChunks(
	query: string,
	matchCount: number = 5,
): Promise<string> {
	try {
		// 1. 生成查询的 embedding
		console.log("为查询生成 embedding...");
		const queryEmbedding = await generateEmbedding(query);
		console.log(`成功生成查询 embedding，维度: ${queryEmbedding.length}`);

		// 2. 调用 Supabase 的向量搜索函数
		const supabase = getAdminSupabase();
		const { data, error } = await supabase.rpc("match_document_chunks", {
			query_embedding: queryEmbedding,
			match_count: matchCount,
		});

		if (error) {
			console.error("向量搜索失败:", error);
			return ""; // 搜索失败时返回空字符串
		}

		if (!data || data.length === 0) {
			console.log("未找到相关文档分块");
			return "";
		}

		// 3. 拼接相关分块作为 context
		const relevantContext = (data as DocumentChunk[])
			.map(
				(chunk: DocumentChunk, index: number) =>
					`[相关文档 ${index + 1}] (相似度: ${(chunk.similarity * 100).toFixed(1)}%)\n${chunk.content}`,
			)
			.join("\n\n");

		console.log(`找到 ${data.length} 个相关文档分块`);
		return relevantContext;
	} catch (error) {
		console.error("搜索文档失败:", error);
		return ""; // 搜索失败时返回空字符串
	}
}

export async function POST(request: Request) {
	try {
		const { messages, caseContext, caseId } = await request.json();

		if (!process.env.DEEPSEEK_API_KEY) {
			console.error("缺少 DEEPSEEK_API_KEY 环境变量");
			return NextResponse.json(
				{ error: "服务器配置错误: 缺少 API 密钥" },
				{ status: 500 },
			);
		}

		if (!messages || !Array.isArray(messages)) {
			return NextResponse.json({ error: "消息格式错误" }, { status: 400 });
		}

		// 获取最后一个用户消息用于搜索
		const lastUserMessage = [...messages]
			.reverse()
			.find((msg: ChatMessage) => msg.role === "user")?.content;

		let relevantContext = "";
		if (lastUserMessage && caseId) {
			// 搜索相关的文档分块
			relevantContext = await searchRelevantChunks(lastUserMessage);
		}

		// 构建系统提示
		let systemPrompt = `你是一个法律助手AI。你正在帮助用户分析一个法律案件。

案件信息：
${caseContext || "暂无案件信息"}`;

		// 如果找到了相关文档，添加到系统提示
		if (relevantContext) {
			systemPrompt += `

根据案件文档的相关内容：
${relevantContext}`;
		}

		systemPrompt += `

请根据案件信息和相关文档内容，为用户提供有建设性的法律意见和分析。保持专业但易于理解。如果文档不相关，请忽略文档并直接回答用户问题。`;

		const result = streamText({
			model: deepseek("deepseek-chat"),
			system: systemPrompt,
			messages: messages.map((msg: ChatMessage) => ({
				role: msg.role,
				content: msg.content,
			})),
		});

		// 使用 toTextStreamResponse 返回流式文本响应
		return result.toTextStreamResponse();
	} catch (error) {
		console.error("聊天 API 错误:", error);
		const errorMessage = error instanceof Error ? error.message : "未知错误";
		return NextResponse.json(
			{ error: `聊天服务错误: ${errorMessage}` },
			{ status: 500 },
		);
	}
}
