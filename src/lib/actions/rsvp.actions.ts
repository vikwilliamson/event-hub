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
 * RSVP to an event. Uses deterministic doc ID to prevent duplicates.
 * Updates event rsvpCount atomically.
 */
export async function rsvpEvent(eventId: string, organizerId: string): Promise<RsvpResult> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const userId = session.uid;
  const rsvpId = `${eventId}_${userId}`;

  try {
    // Check if already RSVP'd
    const existingRsvp = await getUserRsvp(eventId, userId);
    if (existingRsvp) {
      return { ok: false, error: "You have already RSVP'd to this event" };
    }

    // Get event details for snapshot and validation
    const eventSnap = await getEventRef(organizerId, eventId).get();
    if (!eventSnap.exists) {
      return { ok: false, error: "Event not found" };
    }
    const event = eventSnap.data()!;

    // Create RSVP with deterministic ID
    const rsvp: Rsvp = {
      id: rsvpId,
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

    const db = getRsvpRef(eventId, userId).firestore;
    
    // Use transaction to ensure atomicity
    await db.runTransaction(async (transaction) => {
      // Create RSVP
      transaction.set(getRsvpRef(eventId, userId), rsvp);
      
      // Update event RSVP count
      const eventRef = getEventRef(organizerId, eventId);
      transaction.update(eventRef, {
        rsvpCount: event.rsvpCount + 1,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return { ok: true, data: { rsvp } };
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
    const existingRsvp = await getUserRsvp(eventId, userId);
    if (!existingRsvp) {
      return { ok: false, error: "No RSVP found for this event" };
    }

    // Get event for rsvpCount update
    const eventSnap = await getEventRef(organizerId, eventId).get();
    if (!eventSnap.exists) {
      return { ok: false, error: "Event not found" };
    }
    const event = eventSnap.data()!;

    const db = getRsvpRef(eventId, userId).firestore;
    
    // Use transaction to ensure atomicity
    await db.runTransaction(async (transaction) => {
      // Update RSVP with cancellation
      transaction.update(getRsvpRef(eventId, userId), {
        cancelledAt: FieldValue.serverTimestamp(),
      });
      
      // Update event RSVP count (ensure it doesn't go below 0)
      const eventRef = getEventRef(organizerId, eventId);
      transaction.update(eventRef, {
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
