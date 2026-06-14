"use client";

import { useToast, type Toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils/cn";

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast();

  return (
    <div
      role="status"
      aria-atomic="true"
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border px-4 py-3 shadow-md text-sm",
        toast.type === "success" &&
          "border-green-200 bg-green-50 text-green-900",
        toast.type === "error" && "border-red-200 bg-red-50 text-red-900",
        toast.type === "info" &&
          "border-neutral-200 bg-white text-neutral-900"
      )}
    >
      <span>{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 text-current opacity-60 hover:opacity-100 focus-visible:outline focus-visible:ring-2 focus-visible:ring-current rounded"
      >
        ✕
      </button>
    </div>
  );
}

export { ToastItem };
