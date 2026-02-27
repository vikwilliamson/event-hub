import { getAdminFirestore } from "./admin";
import { eventConverter } from "./converters";
import type { Event } from "./types";

/**
 * Get all events across all organizers (for public browsing).
 * This is a simple implementation - in production you'd want pagination
 * and better indexing.
 */
export async function getAllPublishedEvents(): Promise<Event[]> {
  const db = getAdminFirestore();
  
  // Query all organizer collections for published events
  const organizersSnap = await db.collection("organizers").get();
  const events: Event[] = [];
  
  for (const organizerDoc of organizersSnap.docs) {
    const eventsSnap = await db
      .collection("organizers")
      .doc(organizerDoc.id)
      .collection("events")
      .where("status", "==", "published")
      .orderBy("startsAt", "asc")
      .withConverter(eventConverter)
      .get();
    
    events.push(...eventsSnap.docs.map(doc => doc.data()));
  }
  
  return events.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/**
 * Find an event by its ID across all organizers.
 * Returns the event with its organizerId.
 */
export async function findEventById(eventId: string): Promise<{ event: Event; organizerId: string } | null> {
  const db = getAdminFirestore();
  
  // Query all organizer collections for the event
  const organizersSnap = await db.collection("organizers").get();
  
  for (const organizerDoc of organizersSnap.docs) {
    const eventDoc = await db
      .collection("organizers")
      .doc(organizerDoc.id)
      .collection("events")
      .doc(eventId)
      .withConverter(eventConverter)
      .get();
    
    if (eventDoc.exists) {
      const event = eventDoc.data();
      if (event) {
        return { event, organizerId: organizerDoc.id };
      }
    }
  }
  
  return null;
}
