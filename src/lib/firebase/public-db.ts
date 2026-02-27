import { getAdminFirestore } from "./admin";
import { eventConverter } from "./converters";
import type { Event } from "./types";

/**
 * Public database access functions for reading published events.
 * These functions are used in public routes and don't require authentication.
 */

/**
 * Fetch all published events from all organizers.
 * Returns events sorted by start date (upcoming first).
 */
export async function getAllPublishedEvents(): Promise<Event[]> {
  const db = getAdminFirestore();
  const organizersSnapshot = await db.collection("organizers").get();
  
  const allEvents: Event[] = [];
  
  for (const organizerDoc of organizersSnapshot.docs) {
    const organizerId = organizerDoc.id;
    const eventsSnapshot = await db
      .collection("organizers")
      .doc(organizerId)
      .collection("events")
      .where("status", "==", "published")
      .withConverter(eventConverter)
      .get();
    
    const events = eventsSnapshot.docs.map(doc => doc.data());
    allEvents.push(...events);
  }
  
  // Sort by start date (upcoming events first)
  return allEvents.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
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
 * Returns { event, organizerId } if found, null otherwise.
 */
export async function findEventById(eventId: string): Promise<{ event: Event; organizerId: string } | null> {
  const db = getAdminFirestore();
  const organizersSnapshot = await db.collection("organizers").get();
  
  for (const organizerDoc of organizersSnapshot.docs) {
    const organizerId = organizerDoc.id;
    const eventSnap = await db
      .collection("organizers")
      .doc(organizerId)
      .collection("events")
      .doc(eventId)
      .withConverter(eventConverter)
      .get();
    
    if (eventSnap.exists) {
      const event = eventSnap.data();
      if (event && event.status === "published") {
        return { event, organizerId };
      }
    }
  }
  
  return null;
}
