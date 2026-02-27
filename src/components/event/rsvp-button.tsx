"use client";

import { Button } from "@/components/ui/button";
import { useRsvp } from "@/hooks/use-rsvp";
import Link from "next/link";

export interface RsvpButtonProps {
  eventId: string;
  organizerId: string;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

/**
 * RSVP button component with proper state management and accessibility.
 * Handles all RSVP states: loading, authenticated, unauthenticated, error.
 */
export function RsvpButton({
  eventId,
  organizerId,
  className,
  variant = "primary",
  size = "md",
}: RsvpButtonProps) {
  const { status, isRsvped, isLoading, error, rsvp, cancel, toggle } = useRsvp(eventId, organizerId);

  // Show loading state
  if (status === "loading") {
    return (
      <Button
        variant={variant}
        size={size}
        isLoading={true}
        loadingLabel="Loading..."
        disabled={true}
        className={className}
        aria-label="Loading RSVP status"
      >
        Loading...
      </Button>
    );
  }

  // Show sign in prompt for unauthenticated users
  if (status === "unauthenticated") {
    return (
      <Link href="/login" className="inline-block">
        <Button
          variant={variant}
          size={size}
          className={className}
          aria-label="Sign in to RSVP"
        >
          Sign in to RSVP
        </Button>
      </Link>
    );
  }

  // Show error state
  if (status === "error") {
    return (
      <Button
        variant="danger"
        size={size}
        disabled={true}
        className={className}
        aria-label="RSVP unavailable"
      >
        RSVP unavailable
      </Button>
    );
  }

  // Show RSVP states for authenticated users
  if (isRsvped) {
    return (
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
          onClick={() => cancel(eventId, organizerId)}
          aria-label="Cancel RSVP"
        >
          Cancel
        </Button>
      </div>
    );
  }

  // Show RSVP button for users who haven't RSVP'd yet
  return (
    <Button
      variant={variant}
      size={size}
      isLoading={isLoading}
      loadingLabel="RSVPing..."
      disabled={isLoading}
      className={className}
      onClick={() => rsvp(eventId, organizerId)}
      aria-pressed="false"
      aria-label="RSVP to this event"
    >
      RSVP
    </Button>
  );
}
