"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Upload, X, Trash2 } from "lucide-react";

// 常量定义
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_FILE_SIZE_MB = 100;

interface CaseFormProps {
	caseId?: string;
	onSuccess?: () => void;
}

interface CaseData {
	id?: string;
	title: string;
	description: string;
}

interface FileWithId {
	id: string;
	file: File;
}

interface ExistingFile {
	id: number;
	name: string;
	url: string;
	created_at: string;
}

export function CaseForm({ caseId, onSuccess }: CaseFormProps) {
	const router = useRouter();
	const { user, session } = useAuth();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [formData, setFormData] = useState<CaseData>({
		title: "",
		description: "",
	});
	const [files, setFiles] = useState<FileWithId[]>([]);
	const [uploading, setUploading] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [existingFiles, setExistingFiles] = useState<ExistingFile[]>([]);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	// 如果是编辑模式，加载原有数据
	useEffect(() => {
		if (!caseId || !user || !session) {
			return;
		}

		const fetchCaseData = async () => {
			try {
				const { data } = await supabase.auth.getSession();
				const token = data.session?.access_token;

				if (!token) {
					setError("无法获取认证令牌");
					return;
				}

				const response = await fetch(`/api/cases/${caseId}`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				if (!response.ok) {
					throw new Error("获取案件信息失败");
				}

				const result = await response.json();
				setFormData({
					id: result.case.id,
					title: result.case.title,
					description: result.case.description,
				});

				// 从 documents 表加载已上传的文件
				const caseIdNum = parseInt(caseId);
				const { data: documents, error: dbError } = await supabase
					.from("documents")
					.select("id, file_name, file_url, created_at")
					.eq("case_id", caseIdNum);

				if (dbError) {
					console.error("documents 查询错误:", dbError);
				}

				if (documents && documents.length > 0) {
					const filesWithPath: ExistingFile[] = documents.map(
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
					setExistingFiles(filesWithPath);
				} else {
					setExistingFiles([]);
				}
			} catch (err) {
				console.error("加载案件信息出错:", err);
				setError(err instanceof Error ? err.message : "加载案件信息失败");
			}
		};

		fetchCaseData();
	}, [caseId, user, session]);

	const handleInputChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			const newFilesWithId: FileWithId[] = [];
			let hasError = false;

			Array.from(e.target.files).forEach((file) => {
				// 检查文件大小
				if (file.size > MAX_FILE_SIZE) {
					setError(
						`文件 "${file.name}" 超过最大限制 ${MAX_FILE_SIZE_MB}MB，当前大小：${(file.size / 1024 / 1024).toFixed(2)}MB`,
					);
					hasError = true;
					return;
				}

				newFilesWithId.push({
					id: `${Date.now()}-${Math.random()}`,
					file,
				});
			});

			if (!hasError) {
				setError(null);
				setFiles((prevFiles) => [...prevFiles, ...newFilesWithId]);
			}

			// 重置input，这样可以再次选择相同的文件
			e.target.value = "";
		}
	};

	const removeFile = (fileId: string) => {
		setFiles((prev) => prev.filter((f) => f.id !== fileId));
	};

	const handleDeleteExistingFile = async (fileId: number) => {
		try {
			const { error } = await supabase
				.from("documents")
				.delete()
				.eq("id", fileId);

			if (error) throw error;

			setExistingFiles((prev) => prev.filter((f) => f.id !== fileId));
		} catch (err) {
			console.error("删除文件出错:", err);
			setError("删除文件失败");
		}
	};

	const handleDeleteCase = async () => {
		try {
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

			setShowDeleteConfirm(false);
			setSuccess(true);

			// 2秒后重定向
			setTimeout(() => {
				router.push("/dashboard");
			}, 2000);
		} catch (err) {
			console.error("删除案件出错:", err);
			setError(err instanceof Error ? err.message : "删除案件失败");
			setShowDeleteConfirm(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(false);
		setLoading(true);

		try {
			if (!formData.title.trim()) {
				setError("案件标题不能为空");
				setLoading(false);
				return;
			}

			const { data } = await supabase.auth.getSession();
			const token = data.session?.access_token;

			if (!token) {
				setError("无法获取认证令牌");
				setLoading(false);
				return;
			}

			let caseId_ = caseId;

			// 创建或更新案件
			if (caseId) {
				// 编辑模式
				const response = await fetch(`/api/cases/${caseId}`, {
					method: "PUT",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						title: formData.title,
						description: formData.description,
					}),
				});

				if (!response.ok) {
					throw new Error("更新案件失败");
				}
			} else {
				// 创建模式
				const response = await fetch("/api/cases", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						title: formData.title,
						description: formData.description,
					}),
				});

				if (!response.ok) {
					throw new Error("创建案件失败");
				}

				const result = await response.json();
				caseId_ = result.case.id;
			}

			// 上传文件
			if (files.length > 0 && caseId_) {
				setUploading(true);
				for (const fileItem of files) {
					const formDataFile = new FormData();
					formDataFile.append("file", fileItem.file);

					const uploadResponse = await fetch(`/api/cases/${caseId_}/upload`, {
						method: "POST",
						headers: {
							Authorization: `Bearer ${token}`,
						},
						body: formDataFile,
					});

					if (!uploadResponse.ok) {
						const errorData = await uploadResponse.json();
						throw new Error(
							errorData.error || `上传文件 ${fileItem.file.name} 失败`,
						);
					}
				}
				setUploading(false);
			}

			setSuccess(true);
			setFormData({ title: "", description: "" });
			setFiles([]);

			// 1秒后重定向
			setTimeout(() => {
				if (onSuccess) {
					onSuccess();
				} else {
					router.push("/dashboard");
				}
			}, 1000);
		} catch (err) {
			console.error("提交表单出错:", err);
			setError(err instanceof Error ? err.message : "提交表单失败，请重试");
		} finally {
			setLoading(false);
			setUploading(false);
		}
	};

	return (
		<Card className="w-full max-w-2xl mx-auto">
			<CardHeader>
				<CardTitle className="text-2xl">
					{caseId ? "编辑案件" : "新建案件"}
				</CardTitle>
				<CardDescription>
					{caseId ? "更新您的案件信息" : "创建一个新的法律案件"}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-6">
					{/* 标题 */}
					<div className="space-y-2">
						<Label htmlFor="title" className="text-base font-semibold">
							案件标题 *
						</Label>
						<Input
							id="title"
							name="title"
							placeholder="输入案件标题"
							value={formData.title}
							onChange={handleInputChange}
							disabled={loading}
							required
							className="text-base"
						/>
					</div>

					{/* 描述 */}
					<div className="space-y-2">
						<Label htmlFor="description" className="text-base font-semibold">
							案件描述
						</Label>
						<textarea
							id="description"
							name="description"
							placeholder="输入案件详细描述（可选）"
							value={formData.description}
							onChange={handleInputChange}
							disabled={loading}
							rows={5}
							className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						/>
					</div>

					{/* 文件上传 */}
					<div className="space-y-2">
						<Label htmlFor="files" className="text-base font-semibold">
							上传案件资料
						</Label>

						{/* 已存在的文件（编辑模式） */}
						{caseId && existingFiles.length > 0 && (
							<div className="space-y-2 mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
								<p className="text-sm font-medium text-blue-900">
									当前已上传 {existingFiles.length} 个文件：
								</p>
								<div className="space-y-2">
									{existingFiles.map((file) => (
										<div
											key={file.id}
											className="flex items-center justify-between bg-white p-2 rounded border"
										>
											<span className="text-sm truncate">{file.name}</span>
											<button
												type="button"
												onClick={() => handleDeleteExistingFile(file.id)}
												className="text-destructive hover:bg-destructive/10 p-1 rounded"
											>
												<Trash2 className="h-4 w-4" />
											</button>
										</div>
									))}
								</div>
							</div>
						)}
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									fileInputRef.current?.click();
								}
							}}
							className="w-full border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
							<div className="text-base">
								<span className="text-primary font-semibold">点击选择文件</span>
								<span className="text-muted-foreground ml-1">或拖拽选择</span>
							</div>
							<input
								ref={fileInputRef}
								type="file"
								multiple
								onChange={handleFileChange}
								disabled={loading || uploading}
								className="hidden"
								accept=".pdf,.doc,.docx,.txt,.jpg,.png,.zip"
							/>
							<p className="text-xs text-muted-foreground mt-2">
								支持: PDF, Word, 文本, 图片, ZIP 等 | 单个文件最大{" "}
								{MAX_FILE_SIZE_MB}MB
							</p>
						</button>

						{/* 已选择的文件列表 */}
						{files.length > 0 && (
							<div className="space-y-2 mt-4">
								<p className="text-sm font-medium">
									已选择 {files.length} 个文件:
								</p>
								<div className="space-y-2">
									{files.map((fileItem) => (
										<div
											key={fileItem.id}
											className="flex items-center justify-between bg-secondary p-2 rounded"
										>
											<span className="text-sm truncate">
												{fileItem.file.name} (
												{(fileItem.file.size / 1024 / 1024).toFixed(2)} MB)
											</span>
											<button
												type="button"
												onClick={() => removeFile(fileItem.id)}
												className="text-destructive hover:bg-destructive/10 p-1 rounded"
											>
												<X className="h-4 w-4" />
											</button>
										</div>
									))}
								</div>
								<p className="text-xs text-muted-foreground mt-2">
									💡 提示：单个文件最大 {MAX_FILE_SIZE_MB}MB，总文件数无限制
								</p>
							</div>
						)}
					</div>

					{/* 错误提示 */}
					{error && (
						<div className="rounded-md bg-destructive/10 p-3 flex items-start gap-2">
							<AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
							<p className="text-sm text-destructive">{error}</p>
						</div>
					)}

					{/* 成功提示 */}
					{success && (
						<div className="rounded-md bg-green-50 p-3 flex items-start gap-2">
							<div className="h-5 w-5 text-green-600 shrink-0 mt-0.5">✓</div>
							<p className="text-sm text-green-700">
								{caseId ? "案件已更新" : "案件已创建"}，正在跳转...
							</p>
						</div>
					)}

					{/* 按钮 */}
					<div className="flex gap-3">
						<Button
							type="submit"
							disabled={loading || uploading}
							className="flex-1"
						>
							{loading || uploading ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
									{uploading ? "上传中..." : caseId ? "更新中..." : "创建中..."}
								</>
							) : caseId ? (
								"更新案件"
							) : (
								"创建案件"
							)}
						</Button>
						<Button
							type="button"
							variant="outline"
							disabled={loading || uploading}
							onClick={() => router.back()}
						>
							返回
						</Button>
					</div>

					{/* 删除确认弹窗 */}
					{showDeleteConfirm && (
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
											onClick={() => setShowDeleteConfirm(false)}
											disabled={loading}
										>
											取消
										</Button>
										<Button
											variant="destructive"
											onClick={handleDeleteCase}
											disabled={loading}
										>
											{loading ? (
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
				</form>
			</CardContent>
		</Card>
	);
}
