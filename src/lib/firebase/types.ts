/**
 * Domain types used across the app. Firestore stores Timestamps;
 * converters map these to Date. Server/Client both use these types.
 */
export type EventStatus = "draft" | "published" | "cancelled";

export interface Event {
  id: string;
  organizerId: string;
  organizerName: string;
  title: string;
  description: string;
  location: string;
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

export type RsvpStatus = "confirmed" | "cancelled";

export interface Rsvp {
  id: string;
  eventId: string;
  organizerId: string;
  attendeeName: string;
  attendeeEmail: string;
  cancelToken: string;
  cancelTokenExpiresAt: Date;
  status: RsvpStatus;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
}
