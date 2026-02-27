import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Error message; sets aria-invalid and aria-describedby when present */
  error?: string;
  /** Id of the error element for aria-describedby */
  errorId?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, errorId, id, "aria-invalid": ariaInvalid, ...props },
  ref,
) {
  const describedBy = [errorId].filter(Boolean).join(" ") || undefined;
  return (
    <input
      ref={ref}
      id={id}
      className={cn(
        "block w-full rounded-md border bg-white px-3 py-2 text-base text-neutral-900 placeholder:text-neutral-500",
        "focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-0",
        "disabled:cursor-not-allowed disabled:opacity-60",
        error
          ? "border-red-600 focus:ring-red-600"
          : "border-neutral-300",
        className,
      )}
      aria-invalid={ariaInvalid ?? (error ? true : undefined)}
      aria-describedby={describedBy}
      {...props}
    />
  );
});

export { Input };
