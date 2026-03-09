import { UserMenu } from "@/components/user-menu";
import { id } from "zod/locales";

export default function Home() {
	return (
		<div className="min-h-screen bg-white">
			{/* 导航栏 */}
			<header className="border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">法律助手</h1>
						<p className="text-sm text-gray-600">AI 驱动的法律研究助手</p>
					</div>
					<UserMenu />
				</div>
			</header>

			{/* 主内容 */}
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
					<h2 className="text-xl font-semibold text-blue-900 mb-2">
						欢迎使用 AI 法律助手
					</h2>
					<p className="text-blue-700">
						这是一个由人工智能驱动的法律研究和分析平台。您可以提交法律查询，我们的
						AI 助手将帮助您进行研究和分析。
					</p>
				</div>

				{/* 功能卡片 */}
				<div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
					{[
						{
							id: 1,
							title: "法律查询",
							description: "提交您的法律问题，获得 AI 驱动的分析和建议",
							icon: "⚖️",
						},
						{
							id: 2,
							title: "文件分析",
							description: "上传法律文件进行分析和摘要",
							icon: "📄",
						},
						{
							id: 3,
							title: "案例研究",
							description: "浏览相关的法律案例和判例",
							icon: "📚",
						},
					].map((feature) => (
						<div
							key={feature.id}
							className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
						>
							<div className="text-3xl mb-3">{feature.icon}</div>
							<h3 className="text-lg font-semibold text-gray-900 mb-2">
								{feature.title}
							</h3>
							<p className="text-gray-600 text-sm">{feature.description}</p>
						</div>
					))}
				</div>
			</main>
		</div>
	);
}
