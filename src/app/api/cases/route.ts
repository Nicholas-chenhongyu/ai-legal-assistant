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

export async function GET(request: NextRequest) {
	try {
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

		// 获取用户的cases
		const { data: cases, error } = await supabase
			.from("cases")
			.select("*")
			.eq("user_id", user.id)
			.order("created_at", { ascending: false });

		if (error) {
			throw error;
		}

		return NextResponse.json({ cases });
	} catch (error) {
		console.error("获取Cases出错:", error);
		return NextResponse.json({ error: "获取Cases失败" }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
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

		// 获取请求体
		const { title, description } = await request.json();

		if (!title) {
			return NextResponse.json({ error: "案件标题为必填项" }, { status: 400 });
		}

		// 创建新案件
		const { data: caseData, error } = await supabase
			.from("cases")
			.insert([
				{
					user_id: user.id,
					title,
					description: description || "",
				},
			])
			.select()
			.single();

		if (error) {
			throw error;
		}

		return NextResponse.json({ case: caseData }, { status: 201 });
	} catch (error) {
		console.error("创建Case出错:", error);
		return NextResponse.json({ error: "创建Case失败" }, { status: 500 });
	}
}
