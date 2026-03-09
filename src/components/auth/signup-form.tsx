"use client";

import { AlertCircle, CheckCircle } from "lucide-react";
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

export function SignupForm() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleSignup = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(false);
		setLoading(true);

		// 验证密码匹配
		if (password !== confirmPassword) {
			setError("两次输入的密码不一致");
			setLoading(false);
			return;
		}

		// 验证密码强度
		if (password.length < 6) {
			setError("密码长度至少为 6 个字符");
			setLoading(false);
			return;
		}

		try {
			const { data, error: authError } = await supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: `${window.location.origin}/auth/callback`,
				},
			});

			if (authError) {
				setError(authError.message);
				return;
			}

			if (data.user) {
				setSuccess(true);
				setEmail("");
				setPassword("");
				setConfirmPassword("");

				// 2 秒后导航到登录页
				setTimeout(() => {
					router.push("/login");
				}, 2000);
			}
		} catch (err) {
			setError("注册过程中出现错误，请重试");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="space-y-1">
				<CardTitle className="text-2xl">创建账户</CardTitle>
				<CardDescription>输入您的邮箱和密码来创建新账户</CardDescription>
			</CardHeader>
			<CardContent>
				{success ? (
					<div className="rounded-md bg-green-50 p-4 flex items-start gap-2">
						<CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
						<div className="space-y-1">
							<p className="text-sm font-medium text-green-800">注册成功！</p>
							<p className="text-sm text-green-700">
								请检查您的邮箱以确认账户。
							</p>
							<p className="text-sm text-green-700">
								2 秒后将跳转到登录页面...
							</p>
						</div>
					</div>
				) : (
					<form onSubmit={handleSignup} className="space-y-4">
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
								placeholder="至少 6 个字符"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								disabled={loading}
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="confirmPassword">确认密码</Label>
							<Input
								id="confirmPassword"
								type="password"
								placeholder="再次输入密码"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								disabled={loading}
								required
							/>
						</div>

						{error && (
							<div className="rounded-md bg-destructive/10 p-3 flex items-start gap-2">
								<AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
								<p className="text-sm text-destructive">{error}</p>
							</div>
						)}

						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? "注册中..." : "创建账户"}
						</Button>
					</form>
				)}

				<div className="mt-4 text-center text-sm text-gray-600">
					已有账户？{" "}
					<a
						href="/login"
						className="text-blue-600 hover:underline font-medium"
					>
						登录
					</a>
				</div>
			</CardContent>
		</Card>
	);
}
