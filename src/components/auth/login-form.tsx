"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export function LoginForm() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			const { data, error: authError } = await supabase.auth.signInWithPassword(
				{
					email,
					password,
				},
			);

			if (authError) {
				setError(authError.message);
				return;
			}

			if (data.user) {
				// 登录成功，导航到仪表板
				router.push("/dashboard");
			}
		} catch (err) {
			setError("登录过程中出现错误，请重试");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="space-y-1">
				<CardTitle className="text-2xl">登录</CardTitle>
				<CardDescription>输入您的邮箱和密码继续</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleLogin} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="email">邮箱地址</Label>
						<Input
							id="email"
							type="email"
							placeholder="你的邮箱地址"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							disabled={loading}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="password">密码</Label>
						<Input
							id="password"
							type="password"
							placeholder="输入密码"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							disabled={loading}
							required
						/>
					</div>

					{error && (
						<div className="rounded-md bg-destructive/10 p-3 flex items-start gap-2">
							<AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
							<p className="text-sm text-destructive">{error}</p>
						</div>
					)}

					<Button type="submit" className="w-full" disabled={loading}>
						{loading ? "登录中..." : "登录"}
					</Button>
				</form>

				<div className="mt-4 text-center text-sm text-gray-600">
					没有账户？{" "}
					<a
						href="/signup"
						className="text-blue-600 hover:underline font-medium"
					>
						注册
					</a>
				</div>
			</CardContent>
		</Card>
	);
}
