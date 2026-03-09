import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { createClient } from "@supabase/supabase-js";
import { generateEmbeddingsBatch } from "./embedding";

/**
 * 创建 Supabase 管理员客户端（用于服务器端操作）
 */
function getAdminSupabase() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !supabaseServiceKey) {
		throw new Error("缺少 Supabase 环境变量：需要 SERVICE_ROLE_KEY");
	}

	return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * 从 PDF 文件提取文本内容
 */
export async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
	try {
		const data = await pdfParse(fileBuffer);
		return data.text;
	} catch (error) {
		console.error("PDF 提取失败:", error);
		throw new Error("无法提取 PDF 文本内容");
	}
}

/**
 * 从文本文件提取内容
 */
export function extractTextFromTxt(fileBuffer: Buffer): string {
	return fileBuffer.toString("utf-8");
}

/**
 * 根据文件类型提取文本
 */
export async function extractTextFromFile(
	fileBuffer: Buffer,
	fileName: string,
): Promise<string> {
	const extension = fileName.toLowerCase().split(".").pop();

	switch (extension) {
		case "pdf":
			return await extractTextFromPDF(fileBuffer);
		case "txt":
			return extractTextFromTxt(fileBuffer);
		default:
			throw new Error(`不支持的文件格式: ${extension}`);
	}
}

/**
 * 对文本进行分块
 */
export async function chunkText(
	text: string,
	chunkSize: number = 1000,
	chunkOverlap: number = 200,
): Promise<string[]> {
	const splitter = new RecursiveCharacterTextSplitter({
		chunkSize,
		chunkOverlap,
		separators: ["\n\n", "\n", "。", "，", ""],
	});

	const chunks = await splitter.splitText(text);
	return chunks;
}

/**
 * 解析文件并存储分块
 */
export async function parseAndStoreDocumentChunks(
	fileBuffer: Buffer,
	fileName: string,
	documentId: number,
	caseId: number,
): Promise<number> {
	try {
		// 1. 提取文本
		console.log(`开始处理文件: ${fileName}`);
		const text = await extractTextFromFile(fileBuffer, fileName);
		console.log(`文件提取成功，总长度: ${text.length} 字符`);

		// 2. 进行文本分块
		const chunks = await chunkText(text);
		console.log(`文本分块完成，共 ${chunks.length} 个分块`);

		if (chunks.length === 0) {
			throw new Error("文本分块失败，没有生成任何分块");
		}

		// 3. 生成嵌入
		console.log(`开始为 ${chunks.length} 个分块生成嵌入...`);
		const embeddings = await generateEmbeddingsBatch(
			chunks.map((chunk) => chunk.trim()),
			10, // 每批 10 个
			200, // 每个请求间隔 200ms
		);
		console.log(`嵌入生成完成`);

		// 4. 准备数据插入
		const chunksData = chunks.map((content, index) => ({
			case_id: caseId,
			document_id: documentId,
			chunk_index: index,
			content: content.trim(),
			embedding: embeddings[index] || null, // 使用生成的嵌入
			metadata: {
				file_name: fileName,
				chunk_count: chunks.length,
				original_length: text.length,
				embedding_status: embeddings[index] !== null ? "success" : "failed",
			},
		}));

		// 5. 使用管理员权限批量插入到数据库
		const supabase = getAdminSupabase();
		const { data, error } = await supabase
			.from("document_chunks")
			.insert(chunksData)
			.select("id");

		if (error) {
			console.error("插入分块失败:", error);
			throw new Error(`数据库插入失败: ${error.message}`);
		}

		// 统计成功的嵌入
		const successCount = embeddings.filter((e) => e !== null).length;
		console.log(
			`成功存储 ${data?.length || 0} 个分块到数据库，其中 ${successCount} 个成功生成嵌入`,
		);

		return data?.length || 0;
	} catch (error) {
		console.error("文档解析和存储失败:", error);
		throw error;
	}
}

/**
 * 获取特定文档的所有分块
 */
export async function getDocumentChunks(documentId: number) {
	const supabase = getAdminSupabase();
	const { data, error } = await supabase
		.from("document_chunks")
		.select("*")
		.eq("document_id", documentId)
		.order("chunk_index", { ascending: true });

	if (error) {
		throw new Error(`获取分块失败: ${error.message}`);
	}

	return data;
}

/**
 * 删除特定文档的所有分块
 */
export async function deleteDocumentChunks(documentId: number) {
	const supabase = getAdminSupabase();
	const { error } = await supabase
		.from("document_chunks")
		.delete()
		.eq("document_id", documentId);

	if (error) {
		throw new Error(`删除分块失败: ${error.message}`);
	}
}
