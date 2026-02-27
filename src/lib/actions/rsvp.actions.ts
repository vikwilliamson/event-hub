"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/firebase/auth.server";
import { getRsvpRef, getUserRsvp, getUserRsvps, getEventRsvps } from "@/lib/firebase/rsvp-db";
import { getEventRef } from "@/lib/firebase/db";
import type { Rsvp } from "@/lib/firebase/types";
import { normalizeError } from "@/lib/utils/errors";
import { FieldValue } from "firebase-admin/firestore";

export type RsvpResult =
  | { ok: true; data: { rsvp: Rsvp } }
  | { ok: false; error: string };

export type GetMyRsvpsResult =
  | { ok: true; data: { rsvps: Rsvp[] } }
  | { ok: false; error: string };

/**
 * RSVP to an event. Uses transaction to prevent race conditions.
 * Updates event rsvpCount atomically.
 */
export async function rsvpEvent(eventId: string, organizerId: string): Promise<RsvpResult> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const userId = session.uid;

  try {
    const db = getRsvpRef(organizerId, eventId, userId).firestore;
    
    // Use transaction to ensure atomicity and prevent race conditions
    await db.runTransaction(async (transaction) => {
      // Check if already RSVP'd inside transaction
      const existingRsvpSnap = await transaction.get(getRsvpRef(organizerId, eventId, userId));
      if (existingRsvpSnap.exists && !existingRsvpSnap.data()!.cancelledAt) {
        throw new Error("You have already RSVP'd to this event");
      }

      // Get event details for snapshot and validation
      const eventSnap = await transaction.get(getEventRef(organizerId, eventId));
      if (!eventSnap.exists) {
        throw new Error("Event not found");
      }
      const event = eventSnap.data()!;

      // Create RSVP with user ID as doc ID
      const rsvp: Rsvp = {
        id: userId,
        eventId,
        userId,
        organizerId,
        eventSnapshot: {
          title: event.title,
          startsAt: event.startsAt,
          location: event.location,
        },
        createdAt: new Date(),
        cancelledAt: null,
      };

      // Create RSVP and update event count atomically
      transaction.set(getRsvpRef(organizerId, eventId, userId), rsvp);
      transaction.update(getEventRef(organizerId, eventId), {
        rsvpCount: event.rsvpCount + 1,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    // Return the created RSVP
    const createdRsvp = await getUserRsvp(organizerId, eventId, userId);
    return { ok: true, data: { rsvp: createdRsvp! } };
  } catch (err) {
    return {
      ok: false,
      error: normalizeError(err).message,
    };
  }
}

/**
 * Cancel an RSVP. Sets cancelledAt timestamp and updates event rsvpCount.
 */
export async function cancelRsvp(eventId: string, organizerId: string): Promise<RsvpResult> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const userId = session.uid;

  try {
    // Check if RSVP exists and is not cancelled
    const existingRsvp = await getUserRsvp(organizerId, eventId, userId);
    if (!existingRsvp) {
      return { ok: false, error: "No RSVP found for this event" };
    }

    const db = getRsvpRef(organizerId, eventId, userId).firestore;
    
    // Use transaction to ensure atomicity
    await db.runTransaction(async (transaction) => {
      // Get event for rsvpCount update
      const eventSnap = await transaction.get(getEventRef(organizerId, eventId));
      if (!eventSnap.exists) {
        throw new Error("Event not found");
      }
      const event = eventSnap.data()!;

      // Update RSVP with cancellation
      transaction.update(getRsvpRef(organizerId, eventId, userId), {
        cancelledAt: FieldValue.serverTimestamp(),
      });
      
      // Update event RSVP count (ensure it doesn't go below 0)
      transaction.update(getEventRef(organizerId, eventId), {
        rsvpCount: Math.max(0, event.rsvpCount - 1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    // Return updated RSVP
    const cancelledRsvp = { ...existingRsvp, cancelledAt: new Date() };
    return { ok: true, data: { rsvp: cancelledRsvp } };
  } catch (err) {
    return {
      ok: false,
      error: normalizeError(err).message,
    };
  }
}

/**
 * Get all RSVPs for the current user.
 */
export async function getMyRsvps(): Promise<GetMyRsvpsResult> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  try {
    const rsvps = await getUserRsvps(session.uid);
    return { ok: true, data: { rsvps } };
  } catch (err) {
    return {
      ok: false,
      error: normalizeError(err).message,
    };
  }
}

/**
 * Check if current user has RSVP'd to a specific event.
 */
export async function getUserRsvpStatus(eventId: string, organizerId: string): Promise<{ ok: true; data: { isRsvped: boolean } } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) {
    return { ok: true, data: { isRsvped: false } };
  }

  try {
    const rsvp = await getUserRsvp(organizerId, eventId, session.uid);
    return { ok: true, data: { isRsvped: !!rsvp } };
  } catch (err) {
    return {
      ok: false,
      error: normalizeError(err).message,
    };
  }
}
