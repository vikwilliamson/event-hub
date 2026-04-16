import { getAdminFirestore } from "./admin";
import { eventConverter } from "./converters";
import type { Event } from "./types";

/**
 * Public database access functions for reading published events.
 * These functions are used in public routes and don't require authentication.
 */

/**
 * Fetch all published events from all organizers.
 * Uses optimized collection group query instead of N+1 queries.
 * Returns events sorted by start date (upcoming first).
 */
export async function getAllPublishedEvents(): Promise<Event[]> {
  const db = getAdminFirestore();
  
  // Use collection group query for efficient fetching across all organizers
  const eventsSnapshot = await db
    .collectionGroup("events")
    .where("status", "==", "published")
    .orderBy("startsAt", "asc")
    .withConverter(eventConverter)
    .get();
  
  return eventsSnapshot.docs.map(doc => doc.data());
}

/**
 * Fetch a single published event by organizer and event id.
 * Returns null if not found or not published.
 */
export async function getPublishedEvent(
  organizerId: string,
  eventId: string,
): Promise<Event | null> {
  const db = getAdminFirestore();
  const snap = await db
    .collection("organizers")
    .doc(organizerId)
    .collection("events")
    .doc(eventId)
    .withConverter(eventConverter)
    .get();
  
  if (!snap.exists) return null;
  
  const event = snap.data();
  return event?.status === "published" ? event : null;
}

/**
 * Find an event by its ID across all organizers.
 * Uses optimized collection group query instead of iterating through organizers.
 * Returns { event, organizerId } if found, null otherwise.
 */
export async function findEventById(eventId: string): Promise<{ event: Event; organizerId: string } | null> {
  const db = getAdminFirestore();
  
  // Use collection group query to find event across all organizers efficiently
  const eventsQuery = await db
    .collectionGroup("events")
    .where("__name__", "==", eventId)
    .where("status", "==", "published")
    .limit(1)
    .withConverter(eventConverter)
    .get();

  if (eventsQuery.docs.length === 0) {
    return null;
  }

  const eventDoc = eventsQuery.docs[0];
  const event = eventDoc.data()!;
  
  // Extract organizerId from the document path
  const path = eventDoc.ref.path;
  const organizerId = path.split('/')[1]; // /organizers/{organizerId}/events/{eventId}
  
  return { event, organizerId };
}
