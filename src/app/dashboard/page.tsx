import { CasesList } from "@/components/dashboard/cases-list";

export default function DashboardPage() {
	return (
		<div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-6xl">
				<CasesList />
			</div>
		</div>
	);
}
