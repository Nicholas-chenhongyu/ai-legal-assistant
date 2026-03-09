"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";
import { supabase } from "@/lib/supabase";
import { ChatBox } from "@/components/chat/chatbox";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download, Trash2, Edit, FileText } from "lucide-react";

interface CaseData {
	id: string;
	title: string;
	description: string;
	created_at: string;
	user_id: string;
}

interface CaseFile {
	id: number;
	name: string;
	url: string;
	created_at: string;
}

export default function CaseDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const router = useRouter();
	const { user, session } = useAuth();
	const [caseData, setCaseData] = useState<CaseData | null>(null);
	const [files, setFiles] = useState<CaseFile[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [id, setId] = useState<string>("");

	useEffect(() => {
		// 从params获取id
		params.then(({ id: caseId }) => {
			setId(caseId);
		});
	}, [params]);

	useEffect(() => {
		if (!id || !user || !session) return;

		const fetchCaseData = async () => {
			try {
				setLoading(true);
				setError(null);

				const { data } = await supabase.auth.getSession();
				const token = data.session?.access_token;

				if (!token) {
					setError("无法获取认证令牌");
					return;
				}

				// 获取案件信息
				const response = await fetch(`/api/cases/${id}`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				if (!response.ok) {
					throw new Error("获取案件信息失败");
				}

				const result = await response.json();
				setCaseData(result.case);

				// 从 documents 表获取案件文件列表
				const caseIdNum = parseInt(id);
				const { data: documents, error: dbError } = await supabase
					.from("documents")
					.select("id, file_name, file_url, created_at")
					.eq("case_id", caseIdNum);

				if (!dbError && documents) {
					const filesWithPath: CaseFile[] = documents.map(
						(doc: {
							id: number;
							file_name: string;
							file_url: string;
							created_at: string;
						}) => ({
							id: doc.id,
							name: doc.file_name,
							url: doc.file_url,
							created_at: doc.created_at,
						}),
					);
					setFiles(filesWithPath);
				}
			} catch (err) {
				console.error("加载数据出错:", err);
				setError(err instanceof Error ? err.message : "加载数据失败");
			} finally {
				setLoading(false);
			}
		};

		fetchCaseData();
	}, [id, user, session]);

	const handleDownloadFile = async (fileUrl: string, fileName: string) => {
		try {
			// fileUrl 格式为 "cases/userId/caseId/filename"，需要去掉 bucket 名称
			const pathWithoutBucket = fileUrl.split("/").slice(1).join("/");

			const { data, error } = await supabase.storage
				.from("cases")
				.download(pathWithoutBucket);

			if (error) throw error;

			// 创建下载链接
			const url = window.URL.createObjectURL(data);
			const a = document.createElement("a");
			a.href = url;
			a.download = fileName;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (err) {
			console.error("下载文件出错:", err);
			setError("下载文件失败");
		}
	};

	const handleDeleteFile = async (fileId: number) => {
		try {
			const { error } = await supabase
				.from("documents")
				.delete()
				.eq("id", fileId);

			if (error) throw error;

			setFiles((prev) => prev.filter((f) => f.id !== fileId));
		} catch (err) {
			console.error("删除文件出错:", err);
			setError("删除文件失败");
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
			</div>
		);
	}

	if (error || !caseData) {
		return (
			<div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-6xl">
					<div className="rounded-md bg-destructive/10 p-4 flex items-start gap-2">
						<AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
						<div>
							<p className="text-sm font-medium text-destructive">出错了</p>
							<p className="text-sm text-destructive">
								{error || "案件不存在"}
							</p>
						</div>
					</div>
					<Button className="mt-4" onClick={() => router.push("/dashboard")}>
						返回仪表板
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex">
			{/* 左侧主要内容区域 */}
			<div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 overflow-y-auto">
				<div className="mx-auto max-w-4xl space-y-6">
					{/* 标题和操作按钮 */}
					<div className="flex items-start justify-between">
						<div>
							<h1 className="text-4xl font-bold tracking-tight">
								{caseData.title}
							</h1>
							<p className="text-muted-foreground mt-2">
								创建于{" "}
								{new Date(caseData.created_at).toLocaleDateString("zh-CN")}
							</p>
						</div>
						<div className="flex gap-2">
							<Link href={`/cases/${id}/edit`}>
								<Button className="gap-2">
									<Edit className="h-4 w-4" />
									编辑
								</Button>
							</Link>
							<Button
								variant="outline"
								onClick={() => router.push("/dashboard")}
							>
								返回
							</Button>
						</div>
					</div>

					{/* 描述 */}
					<Card>
						<CardHeader>
							<CardTitle>案件描述</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground whitespace-pre-wrap">
								{caseData.description || "无描述"}
							</p>
						</CardContent>
					</Card>

					{/* 案件资料 */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileText className="h-5 w-5" />
								案件资料
							</CardTitle>
							<CardDescription>
								{files.length === 0
									? "暂无上传的文件"
									: `共 ${files.length} 个文件`}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{files.length === 0 ? (
								<p className="text-muted-foreground text-center py-8">
									暂无上传的资料文件
								</p>
							) : (
								<div className="space-y-2">
									{files.map((file) => (
										<div
											key={file.id}
											className="flex items-center justify-between p-3 rounded-lg border"
										>
											<div className="flex-1 min-w-0">
												<p className="font-medium truncate">{file.name}</p>
												<p className="text-sm text-muted-foreground">
													{new Date(file.created_at).toLocaleDateString(
														"zh-CN",
													)}
												</p>
											</div>
											<div className="flex gap-2 ml-4">
												<button
													type="button"
													onClick={() =>
														handleDownloadFile(file.url, file.name)
													}
													className="p-2 hover:bg-secondary rounded-lg transition-colors"
												>
													<Download className="h-4 w-4" />
												</button>
												<button
													type="button"
													onClick={() => handleDeleteFile(file.id)}
													className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			{/* 右侧固定的 AI 聊天助手 */}
			<ChatBox
				caseContext={`案件标题: ${caseData.title}\n案件描述: ${caseData.description || "无"}`}
				caseId={parseInt(id)}
				variant="fixed-right"
			/>
		</div>
	);
}
