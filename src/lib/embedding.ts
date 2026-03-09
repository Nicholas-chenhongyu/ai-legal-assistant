/**
 * SiliconFlow 嵌入服务
 * 使用 BAAI/bge-m3 模型生成文本向量嵌入
 */

/**
 * 调用 SiliconFlow API 生成单个文本的嵌入
 * @param text 要嵌入的文本
 * @returns 嵌入向量
 */
export async function generateEmbedding(text: string): Promise<number[]> {
	const apiKey = process.env.SILICONFLOW_API_KEY;
	if (!apiKey) {
		throw new Error("缺少 SILICONFLOW_API_KEY 环境变量");
	}

	try {
		const response = await fetch("https://api.siliconflow.cn/v1/embeddings", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: "BAAI/bge-m3",
				input: text,
				encoding_format: "float",
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(
				`SiliconFlow API 错误: ${response.status} - ${error.message || JSON.stringify(error)}`,
			);
		}

		const data = await response.json();

		// SiliconFlow 返回的数据格式
		if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
			throw new Error("API 返回的嵌入数据为空");
		}

		const embedding = data.data[0].embedding;
		if (!Array.isArray(embedding)) {
			throw new Error("API 返回的嵌入数据格式错误");
		}

		console.log(
			`成功生成嵌入: 维度=${embedding.length}, 文本长度=${text.length}`,
		);

		return embedding;
	} catch (error) {
		console.error("生成嵌入失败:", error);
		throw error;
	}
}

/**
 * 批量生成嵌入（带重试逻辑）
 * @param texts 文本数组
 * @param batchSize 批处理大小（默认 10）
 * @param delayMs 请求间隔延迟（毫秒，默认 100）
 * @returns 嵌入向量数组
 */
export async function generateEmbeddingsBatch(
	texts: string[],
	batchSize: number = 10,
	delayMs: number = 100,
): Promise<(number[] | null)[]> {
	const embeddings: (number[] | null)[] = [];

	for (let i = 0; i < texts.length; i += batchSize) {
		const batch = texts.slice(i, Math.min(i + batchSize, texts.length));
		console.log(
			`生成嵌入进度: ${i + 1}/${texts.length} (批 ${Math.ceil((i + 1) / batchSize)})`,
		);

		try {
			for (const text of batch) {
				try {
					const embedding = await generateEmbedding(text);
					embeddings.push(embedding);
				} catch (error) {
					console.error(`为文本生成嵌入失败 (长度: ${text.length}):`, error);
					embeddings.push(null); // 保留 null 表示失败
				}

				// 延迟以避免速率限制
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		} catch (error) {
			console.error("批处理失败:", error);
			// 继续处理其他批次
		}
	}

	return embeddings;
}

/**
 * 格式化 PostgreSQL 向量格式
 * @param vector 数值数组
 * @returns 格式化的向量字符串
 */
export function formatVector(vector: number[]): string {
	return `[${vector.join(",")}]`;
}
