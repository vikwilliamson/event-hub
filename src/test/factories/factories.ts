import type { Event, Rsvp, User } from "@/lib/types";

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

/** A date `days` from now (positive = future). */
export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function makeEvent(overrides: Partial<Event> = {}): Event {
  const now = new Date();
  const id = overrides.id ?? nextId("event");
  return {
    id,
    organizerId: "organizer-1",
    organizerName: "Organizer One",
    title: `Test Event ${id}`,
    description: "A test event description.",
    location: "Denver, CO",
    venueName: null,
    lat: null,
    lng: null,
    category: null,
    startsAt: daysFromNow(7),
    endsAt: null,
    capacity: null,
    rsvpCount: 0,
    status: "published",
    createdAt: now,
    updatedAt: now,
    cancelledAt: null,
    publishedAt: now,
    ...overrides,
  };
}

export function makeRsvp(overrides: Partial<Rsvp> = {}): Rsvp {
  const eventId = overrides.eventId ?? "event-1";
  const userId = overrides.userId ?? "user-1";
  return {
    id: `${eventId}_${userId}`,
    eventId,
    userId,
    organizerId: "organizer-1",
    createdAt: new Date(),
    cancelledAt: null,
    ...overrides,
  };
}

export function makeUser(overrides: Partial<User> = {}): User {
  const id = overrides.id ?? nextId("user");
  return {
    id,
    displayName: `User ${id}`,
    createdAt: new Date(),
    ...overrides,
  };
}

/** Valid payload for the createEvent/updateEvent server actions. */
export function makeEventPayload(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    title: "Community Meetup",
    description: "An evening of talks and networking.",
    location: "Denver, CO",
    startsAt: daysFromNow(14).toISOString(),
    status: "published",
    ...overrides,
  };
}
