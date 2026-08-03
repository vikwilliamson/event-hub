import { getStore } from "@/lib/store";
import type { Event } from "@/lib/types";

/** An event only if it exists and belongs to the given organizer. */
export async function getOwnedEvent(
  organizerId: string,
  eventId: string
): Promise<Event | null> {
  const event = await getStore().read((data) => data.events[eventId] ?? null);
  if (!event || event.organizerId !== organizerId) return null;
  return event;
}
