import { getStore } from "@/lib/store";
import type { Event } from "@/lib/types";

/**
 * Public reads for browse/detail pages. No identity required —
 * only published events are visible.
 */

export async function getAllPublishedEvents(): Promise<Event[]> {
  return getStore().read((data) =>
    Object.values(data.events)
      .filter((event) => event.status === "published")
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  );
}

export async function findEventById(
  eventId: string
): Promise<{ event: Event; organizerId: string } | null> {
  const event = await getStore().read((data) => data.events[eventId] ?? null);
  if (!event || event.status !== "published") return null;
  return { event, organizerId: event.organizerId };
}
