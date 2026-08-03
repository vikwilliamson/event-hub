"use client";

import { Button } from "@/components/ui/button";
import { useRsvp } from "@/hooks/use-rsvp";

export interface RsvpButtonProps {
  eventId: string;
  organizerId: string;
  initialIsRsvped?: boolean;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

/**
 * RSVP button. Every visitor has a demo identity, so there is no
 * signed-out state — just RSVP / Going, with errors announced inline.
 */
export function RsvpButton({
  eventId,
  organizerId,
  initialIsRsvped = false,
  className,
  variant = "primary",
  size = "md",
}: RsvpButtonProps) {
  const { isRsvped, isLoading, error, rsvp, cancel } = useRsvp(
    eventId,
    organizerId,
    initialIsRsvped
  );

  return (
    <div>
      {isRsvped ? (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size={size}
            disabled={isLoading}
            className={className}
            aria-pressed="true"
            aria-label="You are going to this event"
          >
            Going
          </Button>
          <Button
            variant="ghost"
            size={size}
            isLoading={isLoading}
            loadingLabel="Cancelling..."
            disabled={isLoading}
            className={className}
            onClick={cancel}
            aria-label="Cancel RSVP"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant={variant}
          size={size}
          isLoading={isLoading}
          loadingLabel="RSVPing..."
          disabled={isLoading}
          className={className}
          onClick={rsvp}
          aria-pressed="false"
          aria-label="RSVP to this event"
        >
          RSVP
        </Button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
