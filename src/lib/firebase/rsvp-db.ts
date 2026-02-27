import { getAdminFirestore } from "./admin";
import { rsvpConverter } from "./converters";
import type { Rsvp } from "./types";

/**
 * RSVP database access layer (server-only). Uses deterministic doc IDs
 * to prevent duplicates: `${eventId}_${userId}`
 */
export function getRsvpsRef() {
  const db = getAdminFirestore();
  return db.collection("rsvps").withConverter(rsvpConverter);
}

export function getRsvpRef(eventId: string, userId: string) {
  return getRsvpsRef().doc(`${eventId}_${userId}`);
}

/** Check if a user has RSVP'd to an event */
export async function getUserRsvp(eventId: string, userId: string): Promise<Rsvp | null> {
  const snap = await getRsvpRef(eventId, userId).get();
  if (!snap.exists) return null;
  const rsvp = snap.data();
  if (!rsvp) return null;
  // Consider cancelled RSVPs as not RSVP'd
  return rsvp.cancelledAt ? null : rsvp;
}

/** Get all RSVPs for a specific user (for "My RSVPs" page) */
export async function getUserRsvps(userId: string): Promise<Rsvp[]> {
  const snap = await getRsvpsRef()
    .where("userId", "==", userId)
    .where("cancelledAt", "==", null)
    .orderBy("createdAt", "desc")
    .get();
  
  return snap.docs.map(doc => doc.data());
}

/** Get all RSVPs for a specific event (for attendee counts) */
export async function getEventRsvps(eventId: string): Promise<Rsvp[]> {
  const snap = await getRsvpsRef()
    .where("eventId", "==", eventId)
    .where("cancelledAt", "==", null)
    .get();
  
  return snap.docs.map(doc => doc.data());
}
