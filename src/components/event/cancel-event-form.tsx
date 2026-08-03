"use client";

import { Button } from "@/components/ui/button";

interface CancelEventFormProps {
  /** Server action invoked after the user confirms. */
  action: () => Promise<void>;
}

/**
 * Cancel-event button with a confirmation prompt. Client component because
 * the confirm() interception is an onSubmit handler, which a Server
 * Component cannot render.
 */
export function CancelEventForm({ action }: CancelEventFormProps) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Cancel this event? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="danger">
        Cancel event
      </Button>
    </form>
  );
}
