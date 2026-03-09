import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

function getAuthClient(request: NextRequest) {
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
	const token = authHeader.substring(7);

	return { supabase, token };
}

// 获取特定文档的所有分块
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; documentId: string }> },
) {
	try {
		const auth = getAuthClient(request);
		if (!auth) {
			return NextResponse.json({ error: "未授权" }, { status: 401 });
		}

		const { supabase, token } = auth;

		// 验证 token
		const {
			data: { user },
		} = await supabase.auth.getUser(token);

		if (!user) {
			return NextResponse.json({ error: "用户未认证" }, { status: 401 });
		}

		const { id: caseId, documentId } = await params;

		// 验证 case 属于当前用户
		const { data: caseData } = await supabase
			.from("cases")
			.select("id")
			.eq("id", caseId)
			.eq("user_id", user.id)
			.single();

		if (!caseData) {
			return NextResponse.json(
				{ error: "案件不存在或无权限访问" },
				{ status: 403 },
			);
		}

		// 获取文档分块
		const { data: chunks, error } = await supabase
			.from("document_chunks")
			.select("*")
			.eq("document_id", documentId)
			.eq("case_id", caseId)
			.order("chunk_index", { ascending: true });

		if (error) {
			throw error;
		}

		return NextResponse.json(
			{
				document_id: documentId,
				chunks: chunks || [],
				total_chunks: chunks?.length || 0,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("获取文档分块出错:", error);
		return NextResponse.json({ error: "获取分块失败" }, { status: 500 });
	}
}

// 删除特定文档的所有分块
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; documentId: string }> },
) {
	try {
		const auth = getAuthClient(request);
		if (!auth) {
			return NextResponse.json({ error: "未授权" }, { status: 401 });
		}

		const { supabase, token } = auth;

		// 验证 token
		const {
			data: { user },
		} = await supabase.auth.getUser(token);

		if (!user) {
			return NextResponse.json({ error: "用户未认证" }, { status: 401 });
		}

		const { id: caseId, documentId } = await params;

		// 验证 case 属于当前用户
		const { data: caseData } = await supabase
			.from("cases")
			.select("id")
			.eq("id", caseId)
			.eq("user_id", user.id)
			.single();

		if (!caseData) {
			return NextResponse.json(
				{ error: "案件不存在或无权限访问" },
				{ status: 403 },
			);
		}

		// 删除文档分块
		const { error } = await supabase
			.from("document_chunks")
			.delete()
			.eq("document_id", documentId)
			.eq("case_id", caseId);

		if (error) {
			throw error;
		}

		return NextResponse.json({ message: "分块已删除" }, { status: 200 });
	} catch (error) {
		console.error("删除文档分块出错:", error);
		return NextResponse.json({ error: "删除分块失败" }, { status: 500 });
	}
}
