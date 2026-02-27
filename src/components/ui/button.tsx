import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  /** Accessible label when loading (e.g. "Submitting") */
  loadingLabel?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    isLoading,
    loadingLabel = "Loading",
    disabled,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={props.type ?? "button"}
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-md transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
        variant === "primary" && "bg-neutral-900 text-white hover:bg-neutral-800 focus-visible:ring-neutral-900",
        variant === "secondary" && "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 focus-visible:ring-neutral-400",
        variant === "ghost" && "text-neutral-700 hover:bg-neutral-100 focus-visible:ring-neutral-400",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
        size === "sm" && "h-8 px-3 text-sm",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        className,
      )}
      disabled={disabled ?? isLoading}
      aria-busy={isLoading}
      aria-live={isLoading ? "polite" : undefined}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="sr-only">{loadingLabel}</span>
          <span aria-hidden className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </>
      ) : (
        children
      )}
    </button>
  );
});

export { Button };
