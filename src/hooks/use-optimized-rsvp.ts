"use client";

import { useState, useEffect, useCallback } from "react";
import { rsvpEvent, cancelRsvp, getMyRsvps, getUserRsvpStatus } from "@/lib/actions/rsvp.actions";
import type { Rsvp } from "@/lib/firebase/types";

// Simple in-memory cache for RSVP status
const rsvpStatusCache = new Map<string, boolean>();

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
  refresh: () => Promise<void>;
}

/**
 * Optimized RSVP hook with caching and reduced server calls.
 * Uses in-memory cache and optimistic updates.
 */
export function useOptimizedRsvp(eventId: string, organizerId: string): UseRsvpState & UseRsvpActions {
  const [isRsvped, setIsRsvped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<RsvpStatus>("loading");
  
  const cacheKey = `${eventId}_${organizerId}`;

  // Optimized auth and RSVP status check with caching
  const checkRsvpStatus = useCallback(async () => {
    try {
      // Check cache first
      if (rsvpStatusCache.has(cacheKey)) {
        setIsRsvped(rsvpStatusCache.get(cacheKey)!);
        setStatus("authenticated");
        return;
      }

      // Single server call to check both auth and RSVP status
      const [rsvpResult, myRsvpsResult] = await Promise.allSettled([
        getUserRsvpStatus(eventId, organizerId),
        getMyRsvps()
      ]);

      // Determine auth status from myRsvps result
      if (myRsvpsResult.status === "fulfilled" && myRsvpsResult.value.ok) {
        setStatus("authenticated");
        
        // Set RSVP status from result
        if (rsvpResult.status === "fulfilled" && rsvpResult.value.ok) {
          const isRsvpedValue = rsvpResult.value.data.isRsvped;
          setIsRsvped(isRsvpedValue);
          rsvpStatusCache.set(cacheKey, isRsvpedValue);
        } else if (rsvpResult.status === "rejected") {
          setError(rsvpResult.reason?.message || "Failed to check RSVP status");
        }
      } else {
        setStatus("unauthenticated");
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to check status");
    } finally {
      setIsLoading(false);
    }
  }, [eventId, organizerId, cacheKey]);

  useEffect(() => {
    setIsLoading(true);
    checkRsvpStatus();
  }, [checkRsvpStatus]);

  const rsvp = useCallback(async (eventId: string, organizerId: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    // Optimistic update
    setIsRsvped(true);
    rsvpStatusCache.set(cacheKey, true);
    
    try {
      const result = await rsvpEvent(eventId, organizerId);
      if (!result.ok) {
        // Revert optimistic update on failure
        setIsRsvped(false);
        rsvpStatusCache.delete(cacheKey);
        setError(result.error);
      }
    } catch (err) {
      // Revert optimistic update on error
      setIsRsvped(false);
      rsvpStatusCache.delete(cacheKey);
      setError(err instanceof Error ? err.message : "Failed to RSVP");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, cacheKey]);

  const cancel = useCallback(async (eventId: string, organizerId: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    // Optimistic update
    setIsRsvped(false);
    rsvpStatusCache.set(cacheKey, false);
    
    try {
      const result = await cancelRsvp(eventId, organizerId);
      if (!result.ok) {
        // Revert optimistic update on failure
        setIsRsvped(true);
        rsvpStatusCache.set(cacheKey, true);
        setError(result.error);
      }
    } catch (err) {
      // Revert optimistic update on error
      setIsRsvped(true);
      rsvpStatusCache.set(cacheKey, true);
      setError(err instanceof Error ? err.message : "Failed to cancel RSVP");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, cacheKey]);

  const toggle = useCallback(async (eventId: string, organizerId: string) => {
    if (isRsvped) {
      await cancel(eventId, organizerId);
    } else {
      await rsvp(eventId, organizerId);
    }
  }, [isRsvped, rsvp, cancel]);

  const refresh = useCallback(async () => {
    // Clear cache and refetch
    rsvpStatusCache.delete(cacheKey);
    setIsLoading(true);
    await checkRsvpStatus();
  }, [cacheKey, checkRsvpStatus]);

  return {
    status,
    isRsvped,
    isLoading,
    error,
    rsvp,
    cancel,
    toggle,
    refresh,
  };
}

/**
 * Optimized hook for My RSVPs with batched event fetching.
 */
export function useOptimizedMyRsvps() {
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRsvps = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchRsvps();
  }, [fetchRsvps]);

  return { rsvps, isLoading, error, refetch: fetchRsvps };
}
