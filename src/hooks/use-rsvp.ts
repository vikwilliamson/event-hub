"use client";

import { useState, useCallback } from "react";
import { rsvpEvent, cancelRsvp } from "@/lib/actions/rsvp.actions";

export interface UseRsvpState {
  isRsvped: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UseRsvpActions {
  rsvp: () => Promise<void>;
  cancel: () => Promise<void>;
  toggle: () => Promise<void>;
}

/**
 * RSVP state with optimistic updates. The server component passes the
 * initial status, so there is no fetch-on-mount round trip.
 */
export function useRsvp(
  eventId: string,
  organizerId: string,
  initialIsRsvped = false
): UseRsvpState & UseRsvpActions {
  const [isRsvped, setIsRsvped] = useState(initialIsRsvped);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (
      optimistic: boolean,
      action: () => Promise<{ ok: true } | { ok: false; error: string }>
    ) => {
      if (isLoading) return;
      setIsLoading(true);
      setError(null);
      setIsRsvped(optimistic);
      try {
        const result = await action();
        if (!result.ok) {
          setIsRsvped(!optimistic);
          setError(result.error);
        }
      } catch (err) {
        setIsRsvped(!optimistic);
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  const rsvp = useCallback(
    () => run(true, () => rsvpEvent(eventId, organizerId)),
    [run, eventId, organizerId]
  );

  const cancel = useCallback(
    () => run(false, () => cancelRsvp(eventId, organizerId)),
    [run, eventId, organizerId]
  );

  const toggle = useCallback(
    () => (isRsvped ? cancel() : rsvp()),
    [isRsvped, cancel, rsvp]
  );

  return { isRsvped, isLoading, error, rsvp, cancel, toggle };
}
