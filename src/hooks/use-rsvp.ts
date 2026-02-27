"use client";

import { useState, useEffect } from "react";
import { rsvpEvent, cancelRsvp, getMyRsvps, getUserRsvpStatus } from "@/lib/actions/rsvp.actions";
import type { Rsvp } from "@/lib/firebase/types";

export type RsvpStatus = "loading" | "authenticated" | "unauthenticated" | "error";

export interface UseRsvpState {
  status: RsvpStatus;
  isRsvped: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UseRsvpActions {
  rsvp: (eventId: string, organizerId: string) => Promise<void>;
  cancel: (eventId: string, organizerId: string) => Promise<void>;
  toggle: (eventId: string, organizerId: string) => Promise<void>;
}

/**
 * Hook to manage RSVP state for a specific event.
 * Provides optimistic updates and proper error handling.
 */
export function useRsvp(eventId: string, organizerId: string): UseRsvpState & UseRsvpActions {
  const [isRsvped, setIsRsvped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<RsvpStatus>("loading");

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check auth status efficiently with a lightweight call
        const result = await getMyRsvps();
        if (result.ok) {
          setStatus("authenticated");
          // Check if already RSVP'd to this specific event
          const rsvpStatus = await getUserRsvpStatus(eventId, organizerId);
          if (rsvpStatus.ok) {
            setIsRsvped(rsvpStatus.data.isRsvped);
          } else {
            setError(rsvpStatus.error);
          }
        } else {
          if (result.error.includes("redirect") || result.error.includes("login")) {
            setStatus("unauthenticated");
          } else {
            setStatus("error");
          }
        }
      } catch (err) {
        setStatus("error");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [eventId, organizerId]);

  const rsvp = async (eventId: string, organizerId: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await rsvpEvent(eventId, organizerId);
      if (result.ok) {
        setIsRsvped(true);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to RSVP");
    } finally {
      setIsLoading(false);
    }
  };

  const cancel = async (eventId: string, organizerId: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await cancelRsvp(eventId, organizerId);
      if (result.ok) {
        setIsRsvped(false);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel RSVP");
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = async (eventId: string, organizerId: string) => {
    if (isRsvped) {
      await cancel(eventId, organizerId);
    } else {
      await rsvp(eventId, organizerId);
    }
  };

  return {
    status,
    isRsvped,
    isLoading,
    error,
    rsvp,
    cancel,
    toggle,
  };
}

/**
 * Hook to get all RSVPs for the current user.
 */
export function useMyRsvps() {
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRsvps = async () => {
      try {
        const result = await getMyRsvps();
        if (result.ok) {
          setRsvps(result.data.rsvps);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch RSVPs");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRsvps();
  }, []);

  const refetch = async () => {
    setIsLoading(true);
    try {
      const result = await getMyRsvps();
      if (result.ok) {
        setRsvps(result.data.rsvps);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch RSVPs");
    } finally {
      setIsLoading(false);
    }
  };

  return { rsvps, isLoading, error, refetch };
}
