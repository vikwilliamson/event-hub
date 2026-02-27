import type { FirestoreDataConverter, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import type { Event, Rsvp, LegacyRsvp } from "./types";

/** Firestore document shape (Timestamps). */
interface EventDoc extends Omit<Event, "startsAt" | "endsAt" | "createdAt" | "updatedAt" | "cancelledAt" | "publishedAt"> {
  startsAt: Timestamp;
  endsAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  cancelledAt: Timestamp | null;
  publishedAt: Timestamp | null;
}

interface RsvpDoc extends Omit<Rsvp, "createdAt" | "cancelledAt"> {
  createdAt: Timestamp;
  cancelledAt: Timestamp | null;
}

interface LegacyRsvpDoc extends Omit<LegacyRsvp, "cancelTokenExpiresAt" | "createdAt" | "updatedAt" | "cancelledAt"> {
  cancelTokenExpiresAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  cancelledAt: Timestamp | null;
}

function toEventDoc(event: Event): EventDoc {
  return {
    ...event,
    startsAt: Timestamp.fromDate(event.startsAt),
    endsAt: event.endsAt ? Timestamp.fromDate(event.endsAt) : null,
    createdAt: Timestamp.fromDate(event.createdAt),
    updatedAt: Timestamp.fromDate(event.updatedAt),
    cancelledAt: event.cancelledAt ? Timestamp.fromDate(event.cancelledAt) : null,
    publishedAt: event.publishedAt ? Timestamp.fromDate(event.publishedAt) : null,
  };
}

function fromEventDoc(snapshot: QueryDocumentSnapshot): Event {
  const d = snapshot.data() as EventDoc;
  return {
    ...d,
    id: snapshot.id,
    startsAt: d.startsAt.toDate(),
    endsAt: d.endsAt?.toDate() ?? null,
    createdAt: d.createdAt.toDate(),
    updatedAt: d.updatedAt.toDate(),
    cancelledAt: d.cancelledAt?.toDate() ?? null,
    publishedAt: d.publishedAt?.toDate() ?? null,
  };
}

export const eventConverter: FirestoreDataConverter<Event> = {
  toFirestore: toEventDoc,
  fromFirestore: fromEventDoc,
};

function toRsvpDoc(rsvp: Rsvp): RsvpDoc {
  return {
    ...rsvp,
    createdAt: Timestamp.fromDate(rsvp.createdAt),
    cancelledAt: rsvp.cancelledAt ? Timestamp.fromDate(rsvp.cancelledAt) : null,
  };
}

function fromRsvpDoc(snapshot: QueryDocumentSnapshot): Rsvp {
  const d = snapshot.data() as RsvpDoc;
  return {
    ...d,
    id: snapshot.id,
    createdAt: d.createdAt.toDate(),
    cancelledAt: d.cancelledAt?.toDate() ?? null,
  };
}

function toLegacyRsvpDoc(rsvp: LegacyRsvp): LegacyRsvpDoc {
  return {
    ...rsvp,
    cancelTokenExpiresAt: Timestamp.fromDate(rsvp.cancelTokenExpiresAt),
    createdAt: Timestamp.fromDate(rsvp.createdAt),
    updatedAt: Timestamp.fromDate(rsvp.updatedAt),
    cancelledAt: rsvp.cancelledAt ? Timestamp.fromDate(rsvp.cancelledAt) : null,
  };
}

function fromLegacyRsvpDoc(snapshot: QueryDocumentSnapshot): LegacyRsvp {
  const d = snapshot.data() as LegacyRsvpDoc;
  return {
    ...d,
    id: snapshot.id,
    cancelTokenExpiresAt: d.cancelTokenExpiresAt.toDate(),
    createdAt: d.createdAt.toDate(),
    updatedAt: d.updatedAt.toDate(),
    cancelledAt: d.cancelledAt?.toDate() ?? null,
  };
}

export const rsvpConverter: FirestoreDataConverter<Rsvp> = {
  toFirestore: toRsvpDoc,
  fromFirestore: fromRsvpDoc,
};

export const legacyRsvpConverter: FirestoreDataConverter<LegacyRsvp> = {
  toFirestore: toLegacyRsvpDoc,
  fromFirestore: fromLegacyRsvpDoc,
};
