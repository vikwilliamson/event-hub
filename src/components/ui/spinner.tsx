import { cn } from "@/lib/utils/cn";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Accessible label (required for standalone use) */
  "aria-label": string;
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
};

/**
 * Loading spinner. Use aria-label for accessibility (e.g. "Loading").
 * Prefer wrapping in a container with aria-busy and aria-live when used in buttons or inline.
 */
export function Spinner({ size = "md", className, "aria-label": ariaLabel }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={cn(
        "inline-block border-current border-t-transparent rounded-full animate-spin",
        sizeClasses[size],
        className,
      )}
    />
  );
}
