"use server";

import { getStore } from "@/lib/store";
import {
  getDemoSession,
  getOrCreateSessionUser,
  displayNameForUid,
} from "@/lib/session";
import type { Rsvp } from "@/lib/types";
import { normalizeError } from "@/lib/utils/errors";
import { revalidatePath } from "next/cache";

const NO_SESSION_ERROR =
  "No demo identity found. Refresh the page and try again.";

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
 * RSVP to an event. Runs inside a store mutation, so the duplicate check,
 * capacity check, and count increment are atomic.
 */
export async function rsvpEvent(
  eventId: string,
  _organizerId?: string
): Promise<RsvpResult> {
  const user = await getOrCreateSessionUser();
  if (!user) return { ok: false, error: NO_SESSION_ERROR };

  try {
    const result = await getStore().mutate((data): RsvpResult => {
      const event = data.events[eventId];
      if (!event) return { ok: false, error: "Event not found" };
      if (event.status !== "published") {
        return { ok: false, error: "This event is not open for RSVPs" };
      }

      const rsvpId = `${eventId}_${user.id}`;
      const existing = data.rsvps[rsvpId];
      if (existing && !existing.cancelledAt) {
        return { ok: false, error: "You have already RSVP'd to this event" };
      }
      if (event.capacity !== null && event.rsvpCount >= event.capacity) {
        return { ok: false, error: "This event is at capacity" };
      }

      const now = new Date();
      const rsvp: Rsvp = {
        id: rsvpId,
        eventId,
        userId: user.id,
        organizerId: event.organizerId,
        eventSnapshot: {
          title: event.title,
          startsAt: event.startsAt,
          location: event.location,
        },
        createdAt: now,
        cancelledAt: null,
      };
      data.rsvps[rsvpId] = rsvp;
      event.rsvpCount += 1;
      event.updatedAt = now;
      return { ok: true, data: { rsvp } };
    });

    if (result.ok) revalidatePath(`/events/${eventId}`);
    return result;
  } catch (err) {
    return { ok: false, error: normalizeError(err).message };
  }
}

/**
 * Cancel an RSVP. The already-cancelled check and count decrement happen in
 * the same mutation, so a double cancel can never decrement twice.
 */
export async function cancelRsvp(
  eventId: string,
  _organizerId?: string
): Promise<RsvpResult> {
  const session = await getDemoSession();
  if (!session) return { ok: false, error: NO_SESSION_ERROR };

  try {
    const result = await getStore().mutate((data): RsvpResult => {
      const rsvpId = `${eventId}_${session.uid}`;
      const rsvp = data.rsvps[rsvpId];
      if (!rsvp) return { ok: false, error: "No RSVP found for this event" };
      if (rsvp.cancelledAt) {
        return { ok: false, error: "This RSVP is already cancelled" };
      }

      const now = new Date();
      rsvp.cancelledAt = now;

      const event = data.events[eventId];
      if (event) {
        event.rsvpCount = Math.max(0, event.rsvpCount - 1);
        event.updatedAt = now;
      }
      return { ok: true, data: { rsvp } };
    });

    if (result.ok) revalidatePath(`/events/${eventId}`);
    return result;
  } catch (err) {
    return { ok: false, error: normalizeError(err).message };
  }
}

/** All RSVPs for the current user, newest first (cancelled included). */
export async function getMyRsvps(): Promise<GetMyRsvpsResult> {
  const session = await getDemoSession();
  if (!session) return { ok: false, error: NO_SESSION_ERROR };

  try {
    const rsvps = await getStore().read((data) =>
      Object.values(data.rsvps)
        .filter((rsvp) => rsvp.userId === session.uid)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    );
    return { ok: true, data: { rsvps } };
  } catch (err) {
    return { ok: false, error: normalizeError(err).message };
  }
}

/** Confirmed attendees for an event the current user organizes. */
export async function getEventAttendees(
  eventId: string
): Promise<GetEventAttendeesResult> {
  const session = await getDemoSession();
  if (!session) return { ok: false, error: NO_SESSION_ERROR };

  try {
    return await getStore().read((data): GetEventAttendeesResult => {
      const event = data.events[eventId];
      if (!event || event.organizerId !== session.uid) {
        return { ok: false, error: "Event not found." };
      }

      const attendees: AttendeeInfo[] = Object.values(data.rsvps)
        .filter((rsvp) => rsvp.eventId === eventId && !rsvp.cancelledAt)
        .map((rsvp) => ({
          userId: rsvp.userId,
          email: null,
          displayName:
            data.users[rsvp.userId]?.displayName ?? displayNameForUid(rsvp.userId),
          rsvpDate: rsvp.createdAt,
        }))
        .sort((a, b) => a.rsvpDate.getTime() - b.rsvpDate.getTime());

      return { ok: true, data: { attendees, eventTitle: event.title } };
    });
  } catch (err) {
    return { ok: false, error: normalizeError(err).message };
  }
}

/** Whether the current user has an active RSVP for the event. */
export async function getUserRsvpStatus(
  eventId: string,
  _organizerId?: string
): Promise<{ ok: true; data: { isRsvped: boolean } } | { ok: false; error: string }> {
  const session = await getDemoSession();
  if (!session) return { ok: true, data: { isRsvped: false } };

  try {
    const isRsvped = await getStore().read((data) => {
      const rsvp = data.rsvps[`${eventId}_${session.uid}`];
      return !!rsvp && !rsvp.cancelledAt;
    });
    return { ok: true, data: { isRsvped } };
  } catch (err) {
    return { ok: false, error: normalizeError(err).message };
  }
}
