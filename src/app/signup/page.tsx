import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900">法律助手</h1>
					<p className="mt-2 text-gray-600">AI 驱动的法律研究助手</p>
				</div>
				<SignupForm />
			</div>
		</div>
	);
}
