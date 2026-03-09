"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth-context";

const PUBLIC_ROUTES = ["/login", "/signup"];

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
	const { user, loading } = useAuth();
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		if (loading) return;

		const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

		if (!user && !isPublicRoute) {
			router.push("/login");
		}

		if (user && isPublicRoute) {
			router.push("/dashboard");
		}
	}, [user, loading, pathname, router]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
			</div>
		);
	}

	return <>{children}</>;
}
