"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/firebase/auth.server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getRsvpRef, getUserRsvp, getUserRsvps, getEventRsvps } from "@/lib/firebase/rsvp-db";
import { getEvent, getEventRef } from "@/lib/firebase/db";
import type { Event, Rsvp } from "@/lib/firebase/types";
import { normalizeError } from "@/lib/utils/errors";
import { FieldValue } from "firebase-admin/firestore";
import { env } from "@/lib/env";
import { sendRsvpConfirmationEmail } from "@/lib/email";

export type RsvpResult =
  | { ok: true; data: { rsvp: Rsvp } }
  | { ok: false; error: string };

export type GetMyRsvpsResult =
  | { ok: true; data: { rsvps: Rsvp[] } }
  | { ok: false; error: string };

export type AttendeeInfo = {
  userId: string;
  email: string | null;
  displayName: string | null;
  rsvpDate: Date;
};

export type GetEventAttendeesResult =
  | { ok: true; data: { attendees: AttendeeInfo[]; eventTitle: string } }
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

  let capturedEvent: Event | null = null;

  try {
    const db = getRsvpRef(organizerId, eventId, userId).firestore;

    await db.runTransaction(async (transaction) => {
      const existingRsvpSnap = await transaction.get(getRsvpRef(organizerId, eventId, userId));
      if (existingRsvpSnap.exists && !existingRsvpSnap.data()!.cancelledAt) {
        throw new Error("You have already RSVP'd to this event");
      }

      const eventSnap = await transaction.get(getEventRef(organizerId, eventId));
      if (!eventSnap.exists) {
        throw new Error("Event not found");
      }
      const event = eventSnap.data()!;
      capturedEvent = event;

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

      transaction.set(getRsvpRef(organizerId, eventId, userId), rsvp);
      transaction.update(getEventRef(organizerId, eventId), {
        rsvpCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    const createdRsvp = await getUserRsvp(organizerId, eventId, userId);

    // Fire-and-forget confirmation email — never blocks the RSVP response
    if (capturedEvent && session.email) {
      const event = capturedEvent;
      const to = session.email;
      void (async () => {
        try {
          const authUser = await getAdminAuth().getUser(userId);
          const displayName =
            authUser.displayName ?? authUser.email?.split("@")[0] ?? "there";
          await sendRsvpConfirmationEmail({
            to,
            displayName,
            event,
            appUrl: env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          });
        } catch (err) {
          console.warn(
            "[email] rsvp confirmation failed:",
            err instanceof Error ? err.message : String(err)
          );
        }
      })();
    }

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
      const eventSnap = await transaction.get(getEventRef(organizerId, eventId));
      if (!eventSnap.exists) {
        throw new Error("Event not found");
      }

      transaction.update(getRsvpRef(organizerId, eventId, userId), {
        cancelledAt: FieldValue.serverTimestamp(),
      });

      transaction.update(getEventRef(organizerId, eventId), {
        rsvpCount: FieldValue.increment(-1),
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
 * Get confirmed attendees for an event. Organizer-only.
 * Merges RSVP records with Firebase Auth user info (email, displayName).
 */
export async function getEventAttendees(
  eventId: string
): Promise<GetEventAttendeesResult> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  try {
    const event = await getEvent(session.uid, eventId);
    if (!event) return { ok: false, error: "Event not found." };

    const rsvps = await getEventRsvps(session.uid, eventId);
    if (rsvps.length === 0) {
      return {
        ok: true,
        data: { attendees: [], eventTitle: event.title },
      };
    }

    const identifiers = rsvps.map((r) => ({ uid: r.userId }));
    const authResult = await getAdminAuth().getUsers(identifiers);
    const userMap = new Map(authResult.users.map((u) => [u.uid, u]));

    const attendees: AttendeeInfo[] = rsvps
      .map((r) => ({
        userId: r.userId,
        email: userMap.get(r.userId)?.email ?? null,
        displayName: userMap.get(r.userId)?.displayName ?? null,
        rsvpDate: r.createdAt,
      }))
      .sort((a, b) => a.rsvpDate.getTime() - b.rsvpDate.getTime());

    return { ok: true, data: { attendees, eventTitle: event.title } };
  } catch (err) {
    return { ok: false, error: normalizeError(err).message };
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
