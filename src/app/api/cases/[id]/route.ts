import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

export async function GET(
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

		// 获取单个case
		const { data: caseData, error } = await supabase
			.from("cases")
			.select("*")
			.eq("id", id)
			.eq("user_id", user.id)
			.single();

		if (error) {
			return NextResponse.json({ error: "案件不存在" }, { status: 404 });
		}

		return NextResponse.json({ case: caseData });
	} catch (error) {
		console.error("获取Case出错:", error);
		return NextResponse.json({ error: "获取Case失败" }, { status: 500 });
	}
}

export async function PUT(
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
				{ error: "案件不存在或无权限修改" },
				{ status: 403 },
			);
		}

		// 更新case
		const { title, description } = await request.json();

		const { data: updatedCase, error } = await supabase
			.from("cases")
			.update({ title, description })
			.eq("id", id)
			.select()
			.single();

		if (error) {
			throw error;
		}

		return NextResponse.json({ case: updatedCase });
	} catch (error) {
		console.error("更新Case出错:", error);
		return NextResponse.json({ error: "更新Case失败" }, { status: 500 });
	}
}

export async function DELETE(
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
				{ error: "案件不存在或无权限删除" },
				{ status: 403 },
			);
		}

		// 删除Storage中的所有文件
		const { data: fileList } = await supabase.storage
			.from("cases")
			.list(`${user.id}/${id}`);

		if (fileList && fileList.length > 0) {
			const filePaths = fileList.map((f) => `${user.id}/${id}/${f.name}`);
			await supabase.storage.from("cases").remove(filePaths);
		}

		// 删除数据库记录
		const { error } = await supabase
			.from("cases")
			.delete()
			.eq("id", id)
			.eq("user_id", user.id);

		if (error) {
			throw error;
		}

		return NextResponse.json({
			message: "案件已删除",
		});
	} catch (error) {
		console.error("删除Case出错:", error);
		return NextResponse.json({ error: "删除Case失败" }, { status: 500 });
	}
}
