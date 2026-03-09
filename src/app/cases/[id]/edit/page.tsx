import { CaseForm } from "@/components/dashboard/case-form";

type PageProps = {
	params: Promise<{ id: string }>;
};

export default async function EditCasePage({ params }: PageProps) {
	const { id } = await params;

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-6xl">
				<CaseForm caseId={id} />
			</div>
		</div>
	);
}
