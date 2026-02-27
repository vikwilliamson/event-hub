"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/firebase/auth.server";
import { getEventsRef, getOrganizerDisplayName, getOrganizerEventsPage, type EventsPageCursor } from "@/lib/firebase/db";
import type { Event } from "@/lib/firebase/types";
import { validateCreateEventPayload } from "@/lib/validations/event.schema";
import { normalizeError } from "@/lib/utils/errors";

export type CreateEventResult =
  | { ok: true; data: { eventId: string } }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Create an event (draft or published). Organizer-only; session required.
 * Validates payload server-side and writes through the typed Firestore layer.
 */
export async function createEvent(raw: unknown): Promise<CreateEventResult> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const validated = validateCreateEventPayload(raw);
  if (!validated.success) {
    return {
      ok: false,
      error: validated.error,
      fieldErrors: validated.fieldErrors,
    };
  }

  const { title, description, location, startsAt, status } = validated.data;
  const organizerId = session.uid;

  let organizerName: string;
  try {
    organizerName = await getOrganizerDisplayName(organizerId);
  } catch (err) {
    return {
      ok: false,
      error: normalizeError(err).message,
    };
  }

  const now = new Date();
  const startsAtDate = new Date(startsAt);

  const event: Event = {
    id: "", // set below from ref.id
    organizerId,
    organizerName,
    title,
    description,
    location,
    startsAt: startsAtDate,
    endsAt: null,
    capacity: null,
    rsvpCount: 0,
    status,
    createdAt: now,
    updatedAt: now,
    cancelledAt: null,
    publishedAt: status === "published" ? now : null,
  };

  try {
    const eventsRef = getEventsRef(organizerId);
    const docRef = eventsRef.doc();
    event.id = docRef.id;
    await docRef.set(event);
    return { ok: true, data: { eventId: docRef.id } };
  } catch (err) {
    return {
      ok: false,
      error: normalizeError(err).message,
    };
  }
}

export type EventsPageResult = {
  events: Event[];
  nextCursor: EventsPageCursor | null;
};

/**
 * Fetch a page of organizer events for list/load-more. Organizer-only.
 */
export async function getEventsPage(opts: {
  cursor?: EventsPageCursor | null;
  limit?: number;
}): Promise<EventsPageResult> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return getOrganizerEventsPage(session.uid, {
    cursor: opts.cursor ?? undefined,
    limit: opts.limit,
  });
}
