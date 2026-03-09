import * as React from "react";
import { cn } from "@/lib/utils";

interface DrawerContextType {
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
}

const DrawerContext = React.createContext<DrawerContextType | undefined>(
	undefined,
);

interface DrawerProps {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	children: React.ReactNode;
}

const Drawer = ({ open, onOpenChange, children }: DrawerProps) => {
	const [internalOpen, setInternalOpen] = React.useState(open ?? false);
	const isOpen = open !== undefined ? open : internalOpen;

	const handleOpenChange = React.useCallback(
		(newOpen: boolean) => {
			if (open === undefined) {
				setInternalOpen(newOpen);
			}
			onOpenChange?.(newOpen);
		},
		[open, onOpenChange],
	);

	return (
		<DrawerContext.Provider value={{ isOpen, setIsOpen: handleOpenChange }}>
			{children}
		</DrawerContext.Provider>
	);
};

const useDrawer = () => {
	const context = React.useContext(DrawerContext);
	if (!context) {
		throw new Error("useDrawer must be used within a Drawer component");
	}
	return context;
};

interface DrawerTriggerProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	asChild?: boolean;
}

const DrawerTrigger = React.forwardRef<HTMLButtonElement, DrawerTriggerProps>(
	({ onClick, ...props }, ref) => {
		const { setIsOpen } = useDrawer();
		return (
			<button
				ref={ref}
				onClick={(e) => {
					setIsOpen(true);
					onClick?.(e);
				}}
				{...props}
			/>
		);
	},
);
DrawerTrigger.displayName = "DrawerTrigger";

const DrawerOverlay = React.forwardRef<
	HTMLButtonElement,
	React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
	const { setIsOpen } = useDrawer();
	return (
		<button
			ref={ref}
			className={cn(
				"fixed inset-0 z-40 bg-black/50 transition-opacity",
				className,
			)}
			onClick={(e) => {
				setIsOpen(false);
				onClick?.(e);
			}}
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					setIsOpen(false);
				}
			}}
			type="button"
			{...props}
		/>
	);
});
DrawerOverlay.displayName = "DrawerOverlay";

interface DrawerContentProps extends React.HTMLAttributes<HTMLDivElement> {
	side?: "top" | "bottom" | "left" | "right";
}

const DrawerContent = React.forwardRef<HTMLDivElement, DrawerContentProps>(
	({ className, side = "right", ...props }, ref) => {
		const { isOpen } = useDrawer();

		const sideClasses = {
			top: "fixed inset-x-0 top-0",
			bottom: "fixed inset-x-0 bottom-0",
			left: "fixed inset-y-0 left-0 w-96",
			right: "fixed inset-y-0 right-0 w-96",
		};

		const transformClasses = {
			top: isOpen ? "translate-y-0" : "-translate-y-full",
			bottom: isOpen ? "translate-y-0" : "translate-y-full",
			left: isOpen ? "translate-x-0" : "-translate-x-full",
			right: isOpen ? "translate-x-0" : "translate-x-full",
		};

		return (
			<>
				{isOpen && <DrawerOverlay />}
				<div
					ref={ref}
					className={cn(
						"fixed z-50 flex flex-col bg-white shadow-lg transition-transform duration-300 ease-in-out",
						sideClasses[side],
						transformClasses[side],
						className,
					)}
					{...props}
				/>
			</>
		);
	},
);
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn("flex items-center justify-between border-b p-4", className)}
		{...props}
	/>
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn("border-t p-4", className)} {...props} />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
	HTMLHeadingElement,
	React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
	<h2 ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
));
DrawerTitle.displayName = "DrawerTitle";

const DrawerDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
	<p
		ref={ref}
		className={cn("text-sm text-muted-foreground", className)}
		{...props}
	/>
));
DrawerDescription.displayName = "DrawerDescription";

const DrawerClose = React.forwardRef<
	HTMLButtonElement,
	React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, ...props }, ref) => {
	const { setIsOpen } = useDrawer();
	return (
		<button
			ref={ref}
			onClick={(e) => {
				setIsOpen(false);
				onClick?.(e);
			}}
			{...props}
		/>
	);
});
DrawerClose.displayName = "DrawerClose";

export {
	Drawer,
	DrawerTrigger,
	DrawerOverlay,
	DrawerContent,
	DrawerHeader,
	DrawerFooter,
	DrawerTitle,
	DrawerDescription,
	DrawerClose,
	useDrawer,
};
