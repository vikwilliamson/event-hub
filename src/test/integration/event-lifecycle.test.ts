import { describe, it, expect, beforeEach } from "vitest";
import { vi } from "vitest";

const cookieState = vi.hoisted(() => ({ uid: null as string | null }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "eh_uid" && cookieState.uid ? { value: cookieState.uid } : undefined,
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  updateEvent,
  cancelEvent,
  toggleEventStatus,
  getOrganizerEvents,
} from "@/lib/actions/event.actions";
import { MemoryStore, setStore, getStore } from "@/lib/store";
import { makeEvent, makeEventPayload } from "../factories/factories";

async function seedEvent(overrides = {}) {
  const event = makeEvent({ organizerId: "organizer-1", ...overrides });
  await getStore().mutate((d) => {
    d.events[event.id] = event;
  });
  return event;
}

describe("event lifecycle actions", () => {
  beforeEach(() => {
    setStore(new MemoryStore());
    cookieState.uid = "organizer-1";
  });

  describe("updateEvent", () => {
    it("updates an owned event", async () => {
      const event = await seedEvent();
      const result = await updateEvent(
        event.id,
        makeEventPayload({ title: "Renamed Event" })
      );
      expect(result.ok).toBe(true);
      const stored = await getStore().read((d) => d.events[event.id]);
      expect(stored.title).toBe("Renamed Event");
    });

    it("refuses to update another organizer's event", async () => {
      const event = await seedEvent({ organizerId: "someone-else" });
      const result = await updateEvent(event.id, makeEventPayload());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/not found/i);
    });

    it("refuses to update a cancelled event", async () => {
      const event = await seedEvent({ status: "cancelled", cancelledAt: new Date() });
      const result = await updateEvent(event.id, makeEventPayload());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/cancelled/i);
    });
  });

  describe("cancelEvent", () => {
    it("cancels an owned event", async () => {
      const event = await seedEvent();
      const result = await cancelEvent(event.id);
      expect(result.ok).toBe(true);
      const stored = await getStore().read((d) => d.events[event.id]);
      expect(stored.status).toBe("cancelled");
      expect(stored.cancelledAt).toBeInstanceOf(Date);
    });

    it("rejects double-cancel", async () => {
      const event = await seedEvent();
      await cancelEvent(event.id);
      const result = await cancelEvent(event.id);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/already cancelled/i);
    });

    it("refuses to cancel another organizer's event", async () => {
      const event = await seedEvent({ organizerId: "someone-else" });
      const result = await cancelEvent(event.id);
      expect(result.ok).toBe(false);
    });
  });

  describe("toggleEventStatus", () => {
    it("toggles published → draft → published", async () => {
      const event = await seedEvent({ status: "published" });
      const first = await toggleEventStatus(event.id);
      expect(first.ok && first.data.status).toBe("draft");
      const second = await toggleEventStatus(event.id);
      expect(second.ok && second.data.status).toBe("published");
    });

    it("sets publishedAt on first publish and preserves it after", async () => {
      const event = await seedEvent({ status: "draft", publishedAt: null });
      await toggleEventStatus(event.id); // publish
      const afterPublish = await getStore().read((d) => d.events[event.id]);
      expect(afterPublish.publishedAt).toBeInstanceOf(Date);
      const original = afterPublish.publishedAt!.toISOString();

      await toggleEventStatus(event.id); // unpublish
      await toggleEventStatus(event.id); // publish again
      const afterRepublish = await getStore().read((d) => d.events[event.id]);
      expect(afterRepublish.publishedAt!.toISOString()).toBe(original);
    });

    it("refuses to toggle a cancelled event", async () => {
      const event = await seedEvent({ status: "cancelled", cancelledAt: new Date() });
      const result = await toggleEventStatus(event.id);
      expect(result.ok).toBe(false);
    });
  });

  describe("getOrganizerEvents", () => {
    it("returns only the session organizer's events, newest first", async () => {
      await seedEvent({ id: "mine-old", createdAt: new Date("2026-01-01") });
      await seedEvent({ id: "mine-new", createdAt: new Date("2026-06-01") });
      await seedEvent({ id: "theirs", organizerId: "someone-else" });

      const result = await getOrganizerEvents();
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.map((e) => e.id)).toEqual(["mine-new", "mine-old"]);
    });
  });
});
