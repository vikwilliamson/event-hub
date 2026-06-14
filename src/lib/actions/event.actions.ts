"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { eventConverter } from "@/lib/firebase/converters";
import { getSession } from "@/lib/firebase/auth.server";
import { getEvent, getEventRef } from "@/lib/firebase/db";
import type { Event, EventStatus } from "@/lib/firebase/types";
import { normalizeError } from "@/lib/utils/errors";
import { validateCreateEventPayload } from "@/lib/validations/event.schema";

export type CreateEventResult =
  | { ok: true; data: { eventId: string } }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type UpdateEventResult =
  | { ok: true; data: { eventId: string } }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type GetEventsResult =
  | { ok: true; data: Event[] }
  | { ok: false; error: string };

export type CancelEventResult =
  | { ok: true }
  | { ok: false; error: string };

export type ToggleEventStatusResult =
  | { ok: true; data: { status: EventStatus } }
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
      return { ok: false, error: parsed.error, fieldErrors: parsed.fieldErrors };
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
      capacity: parsed.data.capacity ?? null,
      rsvpCount: 0,
      status: parsed.data.status,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      publishedAt: parsed.data.status === "published" ? now : null,
    };

    await docRef.set(event);
    revalidatePath("/dashboard");
    return { ok: true, data: { eventId: docRef.id } };
  } catch (err) {
    return { ok: false, error: normalizeError(err).message };
  }
}

export async function updateEvent(
  eventId: string,
  raw: unknown
): Promise<UpdateEventResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Authentication required." };
  }

  try {
    const parsed = validateCreateEventPayload(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error, fieldErrors: parsed.fieldErrors };
    }

    const existing = await getEvent(session.uid, eventId);
    if (!existing) return { ok: false, error: "Event not found." };
    if (existing.status === "cancelled") {
      return { ok: false, error: "Cannot edit a cancelled event." };
    }

    const now = new Date();
    const updates: Partial<Event> & Record<string, unknown> = {
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      startsAt: new Date(parsed.data.startsAt),
      status: parsed.data.status,
      capacity: parsed.data.capacity ?? null,
      endsAt: null,
      updatedAt: now,
    };

    if (parsed.data.status === "published" && !existing.publishedAt) {
      updates.publishedAt = now;
    }

    await getEventRef(session.uid, eventId).update(updates);
    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: { eventId } };
  } catch (err) {
    return { ok: false, error: normalizeError(err).message };
  }
}

export async function cancelEvent(eventId: string): Promise<CancelEventResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Authentication required." };
  }

  try {
    const existing = await getEvent(session.uid, eventId);
    if (!existing) return { ok: false, error: "Event not found." };
    if (existing.status === "cancelled") {
      return { ok: false, error: "Event is already cancelled." };
    }

    const now = new Date();
    await getEventRef(session.uid, eventId).update({
      status: "cancelled",
      cancelledAt: now,
      updatedAt: now,
    });

    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: normalizeError(err).message };
  }
}

export async function toggleEventStatus(
  eventId: string
): Promise<ToggleEventStatusResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Authentication required." };
  }

  try {
    const existing = await getEvent(session.uid, eventId);
    if (!existing) return { ok: false, error: "Event not found." };
    if (existing.status === "cancelled") {
      return { ok: false, error: "Cannot toggle status of a cancelled event." };
    }

    const newStatus: EventStatus =
      existing.status === "published" ? "draft" : "published";
    const now = new Date();
    const updates: Record<string, unknown> = { status: newStatus, updatedAt: now };

    if (newStatus === "published" && !existing.publishedAt) {
      updates.publishedAt = now;
    }

    await getEventRef(session.uid, eventId).update(updates);
    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: { status: newStatus } };
  } catch (err) {
    return { ok: false, error: normalizeError(err).message };
  }
}
