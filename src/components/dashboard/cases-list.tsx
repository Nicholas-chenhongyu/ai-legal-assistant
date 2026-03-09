"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { supabase } from "@/lib/supabase";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, Trash2 } from "lucide-react";
import Link from "next/link";

interface Case {
	id: string;
	title: string;
	description: string;
	created_at: string;
	user_id: string;
}

export function CasesList() {
	const { user, session } = useAuth();
	const [cases, setCases] = useState<Case[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);

	const handleDeleteCase = async (caseId: string) => {
		try {
			setDeleting(true);
			const { data } = await supabase.auth.getSession();
			const token = data.session?.access_token;

			if (!token) {
				setError("无法获取认证令牌");
				return;
			}

			const response = await fetch(`/api/cases/${caseId}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (!response.ok) {
				throw new Error("删除案件失败");
			}

			// 从列表中移除该案件
			setCases((prev) => prev.filter((c) => c.id !== caseId));
			setDeleteConfirmId(null);
		} catch (err) {
			console.error("删除案件出错:", err);
			setError(err instanceof Error ? err.message : "删除案件失败");
		} finally {
			setDeleting(false);
		}
	};

	useEffect(() => {
		if (!user || !session) return;

		const fetchCases = async () => {
			try {
				setLoading(true);
				setError(null);

				// 获取用户的访问令牌
				const { data } = await supabase.auth.getSession();
				const token = data.session?.access_token;

				if (!token) {
					setError("无法获取认证令牌");
					return;
				}

				// 调用API获取cases
				const response = await fetch("/api/cases", {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				if (!response.ok) {
					throw new Error("获取Cases失败");
				}

				const result = await response.json();
				setCases(result.cases || []);
			} catch (err) {
				console.error("获取Cases出错:", err);
				setError(err instanceof Error ? err.message : "获取Cases时出现错误");
			} finally {
				setLoading(false);
			}
		};

		fetchCases();
	}, [user, session]);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-md bg-destructive/10 p-4 flex items-start gap-2">
				<AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
				<div>
					<p className="text-sm font-medium text-destructive">出错了</p>
					<p className="text-sm text-destructive">{error}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">我的案件</h2>
					<p className="text-muted-foreground">
						管理和查看您创建的所有法律案件
					</p>
				</div>
				<Link href="/cases/new">
					<Button className="gap-2">
						<Plus className="h-4 w-4" />
						新建案件
					</Button>
				</Link>
			</div>

			{cases.length === 0 ? (
				<Card>
					<CardContent className="pt-6">
						<div className="flex flex-col items-center justify-center py-12">
							<p className="text-lg font-medium text-muted-foreground mb-4">
								您还没有创建任何案件
							</p>
							<Link href="/cases/new">
								<Button>创建第一个案件</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4">
					{cases.map((caseItem) => (
						<Link
							key={caseItem.id}
							href={`/cases/${caseItem.id}`}
							className="block hover:no-underline"
						>
							<Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
								<CardHeader>
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1 min-w-0">
											<CardTitle className="text-xl hover:text-primary transition-colors">
												{caseItem.title}
											</CardTitle>
											<CardDescription className="text-sm mt-1 line-clamp-2">
												{caseItem.description || "无描述"}
											</CardDescription>
										</div>
										<div className="flex flex-col items-end gap-2 shrink-0">
											<p className="text-xs text-muted-foreground whitespace-nowrap">
												{new Date(caseItem.created_at).toLocaleDateString(
													"zh-CN",
												)}
											</p>
											<Button
												size="sm"
												variant="destructive"
												className="gap-1"
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													setDeleteConfirmId(caseItem.id);
												}}
											>
												<Trash2 className="h-4 w-4" />
												删除
											</Button>
										</div>
									</div>
								</CardHeader>
							</Card>
						</Link>
					))}
				</div>
			)}

			{/* 删除确认弹窗 */}
			{deleteConfirmId && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<Card className="w-full max-w-md mx-4">
						<CardHeader>
							<CardTitle>确认删除</CardTitle>
							<CardDescription>
								此操作将永久删除该案件及其所有资料文件
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<p className="text-sm text-muted-foreground">
								删除后无法恢复，请谨慎操作。
							</p>
							<div className="flex gap-2 justify-end">
								<Button
									variant="outline"
									onClick={() => setDeleteConfirmId(null)}
									disabled={deleting}
								>
									取消
								</Button>
								<Button
									variant="destructive"
									onClick={() => handleDeleteCase(deleteConfirmId)}
									disabled={deleting}
								>
									{deleting ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
											删除中...
										</>
									) : (
										"确认删除"
									)}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
