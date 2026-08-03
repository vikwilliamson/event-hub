"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/store";
import { getDemoSession, getOrCreateSessionUser } from "@/lib/session";
import type { Event, EventStatus } from "@/lib/types";
import { normalizeError } from "@/lib/utils/errors";
import { validateCreateEventPayload } from "@/lib/validations/event.schema";

const NO_SESSION_ERROR =
  "No demo identity found. Refresh the page and try again.";

export type CreateEventResult =
  | { ok: true; data: { eventId: string } }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type UpdateEventResult =
  | { ok: true; data: { eventId: string } }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type GetEventsResult =
  | { ok: true; data: Event[] }
  | { ok: false; error: string };

export type CancelEventResult = { ok: true } | { ok: false; error: string };

export type ToggleEventStatusResult =
  | { ok: true; data: { status: EventStatus } }
  | { ok: false; error: string };

export async function getOrganizerEvents(): Promise<GetEventsResult> {
  const session = await getDemoSession();
  if (!session) return { ok: false, error: NO_SESSION_ERROR };

  try {
    const events = await getStore().read((data) =>
      Object.values(data.events)
        .filter((event) => event.organizerId === session.uid)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    );
    return { ok: true, data: events };
  } catch (err) {
    return { ok: false, error: normalizeError(err).message };
  }
}

export async function createEvent(raw: unknown): Promise<CreateEventResult> {
  const user = await getOrCreateSessionUser();
  if (!user) return { ok: false, error: NO_SESSION_ERROR };

  try {
    const parsed = validateCreateEventPayload(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error, fieldErrors: parsed.fieldErrors };
    }

    const now = new Date();
    const event: Event = {
      id: randomUUID(),
      organizerId: user.id,
      organizerName: user.displayName,
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      venueName: parsed.data.venueName || null,
      lat: parsed.data.lat ?? null,
      lng: parsed.data.lng ?? null,
      category: parsed.data.category ?? null,
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

    await getStore().mutate((data) => {
      data.events[event.id] = event;
    });

    revalidatePath("/dashboard");
    revalidatePath("/events");
    return { ok: true, data: { eventId: event.id } };
  } catch (err) {
    return { ok: false, error: normalizeError(err).message };
  }
}

export async function updateEvent(
  eventId: string,
  raw: unknown
): Promise<UpdateEventResult> {
  const session = await getDemoSession();
  if (!session) return { ok: false, error: NO_SESSION_ERROR };

  try {
    const parsed = validateCreateEventPayload(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error, fieldErrors: parsed.fieldErrors };
    }

    const result = await getStore().mutate((data): UpdateEventResult => {
      const existing = data.events[eventId];
      if (!existing || existing.organizerId !== session.uid) {
        return { ok: false, error: "Event not found." };
      }
      if (existing.status === "cancelled") {
        return { ok: false, error: "Cannot edit a cancelled event." };
      }

      const now = new Date();
      existing.title = parsed.data.title;
      existing.description = parsed.data.description;
      existing.location = parsed.data.location;
      existing.venueName = parsed.data.venueName || null;
      existing.lat = parsed.data.lat ?? null;
      existing.lng = parsed.data.lng ?? null;
      existing.category = parsed.data.category ?? null;
      existing.startsAt = new Date(parsed.data.startsAt);
      existing.status = parsed.data.status;
      existing.capacity = parsed.data.capacity ?? null;
      existing.updatedAt = now;
      if (parsed.data.status === "published" && !existing.publishedAt) {
        existing.publishedAt = now;
      }
      return { ok: true, data: { eventId } };
    });

    if (result.ok) {
      revalidatePath(`/dashboard/events/${eventId}`);
      revalidatePath("/dashboard");
      revalidatePath("/events");
      revalidatePath(`/events/${eventId}`);
    }
    return result;
  } catch (err) {
    return { ok: false, error: normalizeError(err).message };
  }
}

export async function cancelEvent(eventId: string): Promise<CancelEventResult> {
  const session = await getDemoSession();
  if (!session) return { ok: false, error: NO_SESSION_ERROR };

  try {
    const result = await getStore().mutate((data): CancelEventResult => {
      const existing = data.events[eventId];
      if (!existing || existing.organizerId !== session.uid) {
        return { ok: false, error: "Event not found." };
      }
      if (existing.status === "cancelled") {
        return { ok: false, error: "Event is already cancelled." };
      }

      const now = new Date();
      existing.status = "cancelled";
      existing.cancelledAt = now;
      existing.updatedAt = now;
      return { ok: true };
    });

    if (result.ok) {
      revalidatePath(`/dashboard/events/${eventId}`);
      revalidatePath("/dashboard");
      revalidatePath("/events");
      revalidatePath(`/events/${eventId}`);
    }
    return result;
  } catch (err) {
    return { ok: false, error: normalizeError(err).message };
  }
}

export async function toggleEventStatus(
  eventId: string
): Promise<ToggleEventStatusResult> {
  const session = await getDemoSession();
  if (!session) return { ok: false, error: NO_SESSION_ERROR };

  try {
    const result = await getStore().mutate((data): ToggleEventStatusResult => {
      const existing = data.events[eventId];
      if (!existing || existing.organizerId !== session.uid) {
        return { ok: false, error: "Event not found." };
      }
      if (existing.status === "cancelled") {
        return { ok: false, error: "Cannot toggle status of a cancelled event." };
      }

      const newStatus: EventStatus =
        existing.status === "published" ? "draft" : "published";
      const now = new Date();
      existing.status = newStatus;
      existing.updatedAt = now;
      if (newStatus === "published" && !existing.publishedAt) {
        existing.publishedAt = now;
      }
      return { ok: true, data: { status: newStatus } };
    });

    if (result.ok) {
      revalidatePath(`/dashboard/events/${eventId}`);
      revalidatePath("/dashboard");
      revalidatePath("/events");
      revalidatePath(`/events/${eventId}`);
    }
    return result;
  } catch (err) {
    return { ok: false, error: normalizeError(err).message };
  }
}
