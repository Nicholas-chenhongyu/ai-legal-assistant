import { CaseForm } from "@/components/dashboard/case-form";

export default function NewCasePage() {
	return (
		<div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-6xl">
				<CaseForm />
			</div>
		</div>
	);
}
