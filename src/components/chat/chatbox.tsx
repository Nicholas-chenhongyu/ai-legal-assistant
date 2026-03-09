"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2 } from "lucide-react";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerClose,
} from "@/components/ui/drawer";

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
}

interface ChatBoxProps {
	caseContext: string;
	caseId: number;
	variant?: "bottom" | "sidebar"; // bottom: 底部（原样式），sidebar: 右侧侧边栏
}

export function ChatBox({
	caseContext,
	caseId,
	variant = "bottom",
}: ChatBoxProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [scrollToBottom]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim() || isLoading) return;

		setError(null); // 清除以前的错误

		const userMessage: Message = {
			id: Date.now().toString(),
			role: "user",
			content: input,
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setIsLoading(true);

		try {
			// 收集对话历史
			const formattedMessages = messages.map((msg) => ({
				role: msg.role,
				content: msg.content,
			}));
			formattedMessages.push({
				role: "user",
				content: input,
			});

			const response = await fetch("/api/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					messages: formattedMessages,
					caseContext,
					caseId,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.error || `HTTP ${response.status}: 服务器错误`,
				);
			}

			// 处理流式响应 - toTextStreamResponse 使用标准文本流
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();
			let assistantMessage = "";
			const messageId = (Date.now() + 1).toString();

			// 创建初始的助手消息
			setMessages((prev) => [
				...prev,
				{ id: messageId, role: "assistant", content: "" },
			]);

			if (reader) {
				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						const chunk = decoder.decode(value, { stream: true });
						assistantMessage += chunk;

						// 实时更新消息
						setMessages((prev) => {
							const updated = [...prev];
							const lastMessage = updated[updated.length - 1];
							if (lastMessage.role === "assistant") {
								lastMessage.content = assistantMessage;
							}
							return updated;
						});
					}

					// 处理最后的缓冲区
					const remaining = decoder.decode();
					if (remaining) {
						assistantMessage += remaining;
						setMessages((prev) => {
							const updated = [...prev];
							const lastMessage = updated[updated.length - 1];
							if (lastMessage.role === "assistant") {
								lastMessage.content = assistantMessage;
							}
							return updated;
						});
					}
				} catch (streamError) {
					console.error("读取流失败:", streamError);
					throw streamError;
				}
			}

			if (!assistantMessage) {
				throw new Error("未收到 AI 回复");
			}

			// 成功发送，清空输入框和错误状态
			setInput("");
			setError("");
		} catch (error) {
			console.error("发送消息出错:", error);
			const errorMsg = error instanceof Error ? error.message : "未知错误";
			setError(errorMsg);
			setMessages((prev) => [
				...prev,
				{
					id: Date.now().toString(),
					role: "assistant",
					content: `❌ 错误: ${errorMsg}`,
				},
			]);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<>
			{variant === "bottom" && (
				<div className="fixed bottom-0 left-0 right-0 w-full">
					{!isOpen && (
						<Button
							onClick={() => setIsOpen(true)}
							className="w-full rounded-none rounded-t-lg shadow-lg h-14"
							size="lg"
						>
							💬 AI 法律助手 - 点击打开分析
						</Button>
					)}

					{isOpen && (
						<Card className="shadow-2xl flex flex-col h-175 rounded-none w-full border-t">
							<CardHeader className="border-b shrink-0">
								<div className="flex items-center justify-between">
									<CardTitle>AI 法律助手</CardTitle>
									<div className="flex items-center gap-2">
										{isLoading && (
											<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
										)}
										<button
											onClick={() => setIsOpen(false)}
											className="text-muted-foreground hover:text-foreground"
											type="button"
										>
											✕
										</button>
									</div>
								</div>
							</CardHeader>

							{error && (
								<div className="px-4 py-3 bg-destructive/10 border-b border-destructive/20">
									<p className="text-base text-destructive">⚠️ {error}</p>
								</div>
							)}

							<CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
								{messages.length === 0 && (
									<div className="flex items-center justify-center h-full text-muted-foreground text-base text-center">
										<p>
											你好！我是 AI
											法律助手。请提出你对本案件的问题，我会帮助你进行法律分析。
										</p>
									</div>
								)}

								{messages.map((message) => (
									<div
										key={message.id}
										className={`flex ${
											message.role === "user" ? "justify-end" : "justify-start"
										}`}
									>
										<div
											className={`max-w-2xl px-5 py-3 rounded-lg ${
												message.role === "user"
													? "bg-primary text-primary-foreground rounded-br-none"
													: "bg-secondary text-secondary-foreground rounded-bl-none"
											}`}
										>
											<p className="text-base whitespace-pre-wrap">
												{message.content}
											</p>
										</div>
									</div>
								))}

								{isLoading && (
									<div className="flex justify-start">
										<div className="bg-secondary text-secondary-foreground px-5 py-3 rounded-lg rounded-bl-none">
											<Loader2 className="h-5 w-5 animate-spin" />
										</div>
									</div>
								)}
								<div ref={messagesEndRef} />
							</CardContent>

							<div className="border-t p-5 shrink-0">
								<form onSubmit={handleSubmit} className="flex gap-3">
									<Input
										value={input}
										onChange={(e) => setInput(e.target.value)}
										placeholder="输入你的问题..."
										disabled={isLoading}
										className="flex-1 text-base h-11"
									/>
									<Button
										type="submit"
										size="default"
										disabled={isLoading || !input.trim()}
									>
										{isLoading ? (
											<Loader2 className="h-5 w-5 animate-spin" />
										) : (
											<Send className="h-5 w-5" />
										)}
									</Button>
								</form>
							</div>
						</Card>
					)}
				</div>
			)}

			{variant === "sidebar" && (
				<Drawer open={isOpen} onOpenChange={setIsOpen}>
					{!isOpen && (
						<button
							onClick={() => setIsOpen(true)}
							className="fixed right-0 top-4 z-40 bg-primary text-primary-foreground rounded-l-lg p-2 hover:bg-primary/90 transition-colors"
							type="button"
							title="打开 AI 法律助手"
						>
							💬
						</button>
					)}

					<DrawerContent side="right" className="overflow-hidden">
						<div className="flex flex-col h-screen gap-0">
							<DrawerHeader className="border-b shrink-0 bg-card">
								<div className="flex items-center justify-between w-full">
									<DrawerTitle>AI 法律助手</DrawerTitle>
									<div className="flex items-center gap-2">
										{isLoading && (
											<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
										)}
										<DrawerClose
											className="text-muted-foreground hover:text-foreground"
											type="button"
										>
											✕
										</DrawerClose>
									</div>
								</div>
							</DrawerHeader>

							{error && (
								<div className="px-4 py-3 bg-destructive/10 border-b border-destructive/20 shrink-0">
									<p className="text-sm text-destructive">⚠️ {error}</p>
								</div>
							)}

							<div className="flex-1 overflow-y-auto p-4 space-y-4 bg-card">
								{messages.length === 0 && (
									<div className="flex items-center justify-center h-full text-muted-foreground text-sm text-center">
										<p>你好！我是 AI 法律助手。请提出你对本案件的问题。</p>
									</div>
								)}

								{messages.map((message) => (
									<div
										key={message.id}
										className={`flex ${
											message.role === "user" ? "justify-end" : "justify-start"
										}`}
									>
										<div
											className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
												message.role === "user"
													? "bg-primary text-primary-foreground rounded-br-none"
													: "bg-secondary text-secondary-foreground rounded-bl-none"
											}`}
										>
											<p className="whitespace-pre-wrap">{message.content}</p>
										</div>
									</div>
								))}

								{isLoading && (
									<div className="flex justify-start">
										<div className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg rounded-bl-none">
											<Loader2 className="h-4 w-4 animate-spin" />
										</div>
									</div>
								)}
								<div ref={messagesEndRef} />
							</div>

							<div className="border-t p-3 shrink-0 bg-card">
								<form onSubmit={handleSubmit} className="flex gap-2">
									<Input
										value={input}
										onChange={(e) => setInput(e.target.value)}
										placeholder="输入问题..."
										disabled={isLoading}
										className="flex-1 text-sm h-9"
									/>
									<Button
										type="submit"
										size="sm"
										disabled={isLoading || !input.trim()}
									>
										{isLoading ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Send className="h-4 w-4" />
										)}
									</Button>
								</form>
							</div>
						</div>
					</DrawerContent>
				</Drawer>
			)}
		</>
	);
}
