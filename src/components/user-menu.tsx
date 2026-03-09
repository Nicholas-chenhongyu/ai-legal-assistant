"use client";

import { LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-context";

export function UserMenu() {
	const { user, signOut } = useAuth();
	const router = useRouter();
	const [open, setOpen] = useState(false);

	const handleSignOut = async () => {
		await signOut();
		router.push("/login");
	};

	return (
		<div className="flex items-center gap-4">
			<span className="text-sm text-gray-600">{user?.email}</span>
			<Button
				variant="outline"
				size="sm"
				onClick={handleSignOut}
				className="flex items-center gap-2"
			>
				<LogOut className="w-4 h-4" />
				退出
			</Button>
		</div>
	);
}
