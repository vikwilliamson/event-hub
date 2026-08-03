/**
 * Canonical domain types. The local store persists these directly
 * (dates as ISO strings on disk, revived to Date on load).
 */
export type EventStatus = "draft" | "published" | "cancelled";

export const EVENT_CATEGORIES = [
  "tech",
  "music",
  "food",
  "sports",
  "arts",
  "outdoors",
  "business",
  "community",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export interface Event {
  id: string;
  organizerId: string;
  organizerName: string;
  title: string;
  description: string;
  location: string;
  venueName: string | null;
  lat: number | null;
  lng: number | null;
  category: EventCategory | null;
  startsAt: Date;
  endsAt: Date | null;
  capacity: number | null;
  rsvpCount: number;
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  publishedAt: Date | null;
}

export interface Rsvp {
  id: string; // Deterministic: `${eventId}_${userId}`
  eventId: string;
  userId: string;
  organizerId: string;
  eventSnapshot?: {
    title: string;
    startsAt: Date;
    location: string;
  };
  createdAt: Date;
  cancelledAt: Date | null;
}

export interface User {
  id: string;
  displayName: string;
  createdAt: Date;
}
