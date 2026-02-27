import { getAdminFirestore } from "./admin";
import { eventConverter } from "./converters";
import type { Event } from "./types";

interface PaginatedEventsResult {
  events: Event[];
  hasMore: boolean;
  lastVisible?: any;
}

const EVENTS_PER_PAGE = 20;

/**
 * Optimized event fetching with pagination and query optimization.
 * Uses collection group query with proper indexing.
 */
export async function getPublishedEventsPaginated(
  pageSize: number = EVENTS_PER_PAGE,
  lastVisible?: any
): Promise<PaginatedEventsResult> {
  const db = getAdminFirestore();
  
  let query = db
    .collectionGroup("events")
    .where("status", "==", "published")
    .orderBy("startsAt", "asc")
    .limit(pageSize)
    .withConverter(eventConverter);

  if (lastVisible) {
    query = query.startAfter(lastVisible);
  }

  const snapshot = await query.get();
  const events = snapshot.docs.map(doc => doc.data());
  
  return {
    events,
    hasMore: events.length === pageSize,
    lastVisible: snapshot.docs[snapshot.docs.length - 1],
  };
}

/**
 * Get a single event with its organizer info in one query.
 * Reduces round trips from 2 to 1.
 */
export async function getEventWithOrganizer(eventId: string): Promise<{ event: Event; organizerId: string } | null> {
  const db = getAdminFirestore();
  
  // Use collection group query to find event across all organizers
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

/**
 * Get multiple events by their IDs in a single batched query.
 * Useful for "My RSVPs" page to avoid N+1 queries.
 */
export async function getEventsByIds(eventIds: string[]): Promise<Event[]> {
  if (eventIds.length === 0) return [];
  
  const db = getAdminFirestore();
  const batchSize = 10; // Firestore limit for 'in' queries
  
  const batches: Event[][] = [];
  
  for (let i = 0; i < eventIds.length; i += batchSize) {
    const batch = eventIds.slice(i, i + batchSize);
    const snapshot = await db
      .collectionGroup("events")
      .where("__name__", "in", batch)
      .where("status", "==", "published")
      .withConverter(eventConverter)
      .get();
    
    batches.push(snapshot.docs.map(doc => doc.data()));
  }
  
  return batches.flat();
}
