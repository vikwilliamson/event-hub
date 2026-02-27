import { getAdminFirestore } from "./admin";
import { eventConverter } from "./converters";
import type { Event } from "./types";
import { FieldPath, Timestamp } from "firebase-admin/firestore";

/**
 * Typed Firestore access layer (server-only). Thin wrapper around Admin SDK
 * with converters attached. Use in lib/queries and lib/actions only.
 */
export function getEventsRef(organizerId: string) {
  const db = getAdminFirestore();
  return db
    .collection("organizers")
    .doc(organizerId)
    .collection("events")
    .withConverter(eventConverter);
}

export function getEventRef(organizerId: string, eventId: string) {
  return getEventsRef(organizerId).doc(eventId);
}

/** Fetch a single event by organizer and event id. Returns null if not found. */
export async function getEvent(
  organizerId: string,
  eventId: string,
): Promise<Event | null> {
  const snap = await getEventRef(organizerId, eventId).get();
  if (!snap.exists) return null;
  return snap.data() ?? null;
}

/**
 * Get organizer display name for denormalization onto events.
 * Returns a fallback if the document doesn't exist yet (e.g. first event).
 */
export async function getOrganizerDisplayName(organizerId: string): Promise<string> {
  const db = getAdminFirestore();
  const snap = await db.collection("organizers").doc(organizerId).get();
  const name = snap.exists ? (snap.data() as { displayName?: string } | undefined)?.displayName : undefined;
  return (name && String(name).trim()) || "Organizer";
}

const PAGE_SIZE = 10;

export type EventsPageCursor = { createdAt: string; id: string };

/**
 * Paginated organizer events, newest first. Cursor is opaque to client (createdAt + id).
 * Status and search filtering are done client-side.
 */
export async function getOrganizerEventsPage(
  organizerId: string,
  opts: { limit?: number; cursor?: EventsPageCursor },
): Promise<{ events: Event[]; nextCursor: EventsPageCursor | null }> {
  const limit = opts.limit ?? PAGE_SIZE;
  const ref = getEventsRef(organizerId);
  let query = ref
    .orderBy("createdAt", "desc")
    .orderBy(FieldPath.documentId(), "asc")
    .limit(limit + 1);

  if (opts.cursor) {
    query = query.startAfter(
      Timestamp.fromDate(new Date(opts.cursor.createdAt)),
      opts.cursor.id,
    );
  }

  const snap = await query.get();
  const docs = snap.docs.slice(0, limit);
  const events = docs.map((d) => d.data());
  const last = docs[docs.length - 1];
  const nextCursor: EventsPageCursor | null =
    snap.docs.length > limit && last
      ? { createdAt: last.data().createdAt.toISOString(), id: last.id }
      : null;

  return { events, nextCursor };
}
