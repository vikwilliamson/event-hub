import { cn } from "@/lib/utils/cn";

export interface FieldErrorProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Inline error for a form field. Never rely on color alone: we use "Error:" prefix.
 * Parent input should use aria-describedby={id} and aria-invalid when this is shown.
 */
export function FieldError({ id, children, className }: FieldErrorProps) {
  return (
    <p
      id={id}
      role="alert"
      className={cn("mt-1 text-sm text-red-700", className)}
    >
      <span className="font-medium">Error:</span> {children}
    </p>
  );
}
