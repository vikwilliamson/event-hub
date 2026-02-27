import { getAdminFirestore } from "./admin";
import { rsvpConverter } from "./converters";
import type { Rsvp } from "./types";

/**
 * RSVP database access layer (server-only). Follows documented hierarchy:
 * /organizers/{organizerId}/events/{eventId}/rsvps/{rsvpId}
 */
export function getEventRsvpsRef(organizerId: string, eventId: string) {
  const db = getAdminFirestore();
  return db
    .collection("organizers")
    .doc(organizerId)
    .collection("events")
    .doc(eventId)
    .collection("rsvps")
    .withConverter(rsvpConverter);
}

export function getRsvpRef(organizerId: string, eventId: string, userId: string) {
  return getEventRsvpsRef(organizerId, eventId).doc(userId);
}

/** Check if a user has RSVP'd to an event */
export async function getUserRsvp(organizerId: string, eventId: string, userId: string): Promise<Rsvp | null> {
  const snap = await getRsvpRef(organizerId, eventId, userId).get();
  if (!snap.exists) return null;
  const rsvp = snap.data();
  if (!rsvp) return null;
  // Consider cancelled RSVPs as not RSVP'd
  return rsvp.cancelledAt ? null : rsvp;
}

/** Get all RSVPs for a specific user (requires cross-organizer query) */
export async function getUserRsvps(userId: string): Promise<Rsvp[]> {
  const db = getAdminFirestore();
  // Use collection group query across all organizer/event/rsvps
  const snap = await db
    .collectionGroup("rsvps")
    .where("userId", "==", userId)
    .where("cancelledAt", "==", null)
    .orderBy("createdAt", "desc")
    .withConverter(rsvpConverter)
    .get();
  
  return snap.docs.map(doc => doc.data());
}

/** Get all RSVPs for a specific event */
export async function getEventRsvps(organizerId: string, eventId: string): Promise<Rsvp[]> {
  const snap = await getEventRsvpsRef(organizerId, eventId)
    .where("cancelledAt", "==", null)
    .get();
  
  return snap.docs.map(doc => doc.data());
}
