import { getAdminFirestore } from "./admin";
import { eventConverter } from "./converters";
import type { Event } from "./types";

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
