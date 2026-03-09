import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { parseAndStoreDocumentChunks } from "@/lib/document-parser";

// 常量定义
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

function getAuthUser(request: NextRequest) {
	const authHeader = request.headers.get("authorization");
	if (!authHeader) {
		return null;
	}

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !supabaseServiceKey) {
		throw new Error("缺少 Supabase 环境变量");
	}

	const supabase = createClient(supabaseUrl, supabaseServiceKey);
	const token = authHeader.substring(7); // 移除 "Bearer " 前缀

	return { supabase, token };
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const auth = getAuthUser(request);
		if (!auth) {
			return NextResponse.json({ error: "未授权" }, { status: 401 });
		}

		const { supabase, token } = auth;

		// 验证token并获取用户信息
		const {
			data: { user },
		} = await supabase.auth.getUser(token);

		if (!user) {
			return NextResponse.json({ error: "用户未认证" }, { status: 401 });
		}

		// 验证case属于当前用户
		const { data: caseData } = await supabase
			.from("cases")
			.select("id")
			.eq("id", id)
			.eq("user_id", user.id)
			.single();

		if (!caseData) {
			return NextResponse.json(
				{ error: "案件不存在或无权限上传" },
				{ status: 403 },
			);
		}

		// 创建一个bucket名称：cases/{userId}
		const bucketName = `cases`;
		const filePath = `${user.id}/${id}`;

		const formData = await request.formData();
		const file = formData.get("file") as File;

		// 检查文件大小
		if (file.size > MAX_FILE_SIZE) {
			return NextResponse.json(
				{
					error: `文件大小超过限制。最大允许：100MB，当前文件：${(file.size / 1024 / 1024).toFixed(2)}MB`,
				},
				{ status: 413 },
			);
		}
		if (!file) {
			return NextResponse.json({ error: "未提供文件" }, { status: 400 });
		}

		// 检查或创建bucket
		const { data: buckets } = await supabase.storage.listBuckets();
		const bucketExists = buckets?.some((b) => b.name === bucketName);

		if (!bucketExists) {
			await supabase.storage.createBucket(bucketName, {
				public: false,
			});
		}

		// 上传文件 - 只对文件名进行 sanitize，不加时间戳
		const sanitizedFileName = file.name
			.replace(/[^\w\s.-]/g, "_") // 保留字母、数字、空格、点、横线，其他字符用下划线替换
			.replace(/\s+/g, "_"); // 空格也用下划线替换

		const fullPath = `${filePath}/${sanitizedFileName}`;

		const { data, error } = await supabase.storage
			.from(bucketName)
			.upload(fullPath, file, {
				upsert: true,
			});

		if (error) {
			throw error;
		}

		// 将文件信息写入 documents 表
		const documentPath = `${bucketName}/${data.path}`;
		const { data: documentData, error: dbError } = await supabase
			.from("documents")
			.insert([
				{
					case_id: parseInt(id),
					file_name: file.name, // 保存原始文件名用于显示
					file_url: documentPath,
				},
			])
			.select();

		if (dbError) {
			console.error("向 documents 表写入数据失败:", dbError);
			// 尝试删除已上传的文件
			await supabase.storage.from(bucketName).remove([fullPath]);
			throw dbError;
		}

		const documentId = documentData?.[0]?.id;

		// 异步处理文档解析 - 不阻塞响应，在后台处理
		if (documentId) {
			try {
				// 获取文件缓冲区用于解析
				const { data: fileData, error: downloadError } = await supabase.storage
					.from(bucketName)
					.download(fullPath);

				if (downloadError) {
					console.error("下载文件用于解析失败:", downloadError);
				} else if (fileData) {
					const buffer = await fileData.arrayBuffer();
					const fileBuffer = Buffer.from(buffer);

					// 异步解析文档，不等待完成
					parseAndStoreDocumentChunks(
						fileBuffer,
						file.name,
						documentId,
						parseInt(id),
					).catch((err) => {
						console.error("后台文档解析失败:", err);
					});
				}
			} catch (error) {
				console.error("启动文档解析失败:", error);
				// 不抛出错误，文件上传已成功，解析失败不影响上传结果
			}
		}

		return NextResponse.json(
			{
				message: "文件上传成功，正在解析...",
				path: data.path,
				fileName: sanitizedFileName,
				documentId: documentData?.[0]?.id,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("文件上传出错:", error);
		return NextResponse.json({ error: "文件上传失败" }, { status: 500 });
	}
}
