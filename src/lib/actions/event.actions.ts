"use server";

import { redirect } from "next/navigation";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { eventConverter } from "@/lib/firebase/converters";
import { getSession } from "@/lib/firebase/auth.server";
import type { Event } from "@/lib/firebase/types";
import { normalizeError } from "@/lib/utils/errors";
import { validateCreateEventPayload } from "@/lib/validations/event.schema";

export type CreateEventResult =
  | { ok: true; data: { eventId: string } }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type GetEventsResult =
  | { ok: true; data: Event[] }
  | { ok: false; error: string };

export async function getOrganizerEvents(): Promise<GetEventsResult> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  try {
    const db = getAdminFirestore();
    const eventsSnapshot = await db
      .collection("organizers")
      .doc(session.uid)
      .collection("events")
      .withConverter(eventConverter)
      .get();

    const events = eventsSnapshot.docs.map((doc) => doc.data());
    events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { ok: true, data: events };
  } catch (err) {
    return { ok: false, error: normalizeError(err).message };
  }
}

export async function createEvent(raw: unknown): Promise<CreateEventResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Authentication required." };
  }

  try {
    const parsed = validateCreateEventPayload(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error,
        fieldErrors: parsed.fieldErrors,
      };
    }

    const db = getAdminFirestore();
    const eventsRef = db
      .collection("organizers")
      .doc(session.uid)
      .collection("events")
      .withConverter(eventConverter);

    const docRef = eventsRef.doc();
    const now = new Date();
    const event: Event = {
      id: docRef.id,
      organizerId: session.uid,
      organizerName: session.email ?? session.uid,
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: null,
      capacity: null,
      rsvpCount: 0,
      status: parsed.data.status,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      publishedAt: parsed.data.status === "published" ? now : null,
    };

    await docRef.set(event);
    return { ok: true, data: { eventId: docRef.id } };
  } catch (err) {
    return { ok: false, error: normalizeError(err).message };
  }
}
