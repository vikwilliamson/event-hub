"use client";

import { useToast } from "@/hooks/use-toast";
import { ToastItem } from "@/components/ui/toast";

export function ToastRegion() {
  const { toasts } = useToast();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
