"use server";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { eventConverter } from "@/lib/firebase/converters";
import type { Event } from "@/lib/firebase/types";
import { normalizeError } from "@/lib/utils/errors";
import { validateCreateEventPayload } from "@/lib/validations/event.schema";

export type CreateEventResult =
  | { ok: true; data: { eventId: string } }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type GetEventsResult =
  | { ok: true; data: Event[] }
  | { ok: false; error: string };

/**
 * Get all events for the current organizer (session required).
 */
export async function getOrganizerEvents(): Promise<GetEventsResult> {
  // No authentication required - return all events for demo purposes
  try {
    const db = getAdminFirestore();
    const organizersSnapshot = await db.collection("organizers").get();
    
    const allEvents: Event[] = [];
    
    // Get events from all organizers for demo
    for (const organizerDoc of organizersSnapshot.docs) {
      const organizerId = organizerDoc.id;
      const eventsSnapshot = await db
        .collection("organizers")
        .doc(organizerId)
        .collection("events")
        .withConverter(eventConverter)
        .get();
      
      const events = eventsSnapshot.docs.map(doc => doc.data());
      allEvents.push(...events);
    }
    
    // Sort by creation date (newest first)
    allEvents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return { ok: true, data: allEvents };
  } catch (err) {
    return { ok: false, error: normalizeError(err).message };
  }
}

/**
 * Create an event (draft or published). No authentication required for demo.
 * Validates payload server-side and writes through to default organizer.
 */
export async function createEvent(raw: unknown): Promise<CreateEventResult> {
  // No authentication required - use default organizer for demo
  try {
    const parsed = validateCreateEventPayload(raw);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const fieldErrors: Record<string, string[]> = {};
      for (const [key, messages] of Object.entries(flat.fieldErrors)) {
        if (Array.isArray(messages) && messages.length) fieldErrors[key] = messages;
      }
      return {
        ok: false,
        error: flat.formErrors.join(" ") || "Invalid event data.",
        fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
      };
    }

    const db = getAdminFirestore();
    const eventsRef = db
      .collection("organizers")
      .doc("test_organizer_1") // Default organizer for demo
      .collection("events")
      .withConverter(eventConverter);

    const docRef = eventsRef.doc();
    const event: Event = {
      ...parsed.data,
      id: docRef.id,
      organizerId: "test_organizer_1",
      organizerName: "Tech Events Co",
      createdAt: new Date(),
      updatedAt: new Date(),
      cancelledAt: null,
      publishedAt: parsed.data.status === "published" ? new Date() : null,
      endsAt: parsed.data.endsAt || null,
      capacity: parsed.data.capacity || null,
      rsvpCount: 0,
    };

    await docRef.set(event);
    return { ok: true, data: { eventId: docRef.id } };
  } catch (err) {
    return {
      ok: false,
      error: normalizeError(err).message,
    };
  }
}
