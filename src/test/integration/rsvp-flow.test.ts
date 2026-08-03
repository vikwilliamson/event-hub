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
  rsvpEvent,
  cancelRsvp,
  getMyRsvps,
  getEventAttendees,
  getUserRsvpStatus,
} from "@/lib/actions/rsvp.actions";
import { MemoryStore, setStore, getStore } from "@/lib/store";
import { makeEvent } from "../factories/factories";

const asUser = (uid: string) => {
  cookieState.uid = uid;
};

async function seedEvent(overrides = {}) {
  const event = makeEvent({ organizerId: "organizer-1", ...overrides });
  await getStore().mutate((d) => {
    d.events[event.id] = event;
  });
  return event;
}

const rsvpCount = (eventId: string) =>
  getStore().read((d) => d.events[eventId].rsvpCount);

describe("RSVP flow", () => {
  beforeEach(() => {
    setStore(new MemoryStore());
    asUser("user-1");
  });

  it("creates an RSVP and increments the event count", async () => {
    const event = await seedEvent();
    const result = await rsvpEvent(event.id, event.organizerId);
    expect(result.ok).toBe(true);
    expect(await rsvpCount(event.id)).toBe(1);

    const status = await getUserRsvpStatus(event.id, event.organizerId);
    expect(status.ok && status.data.isRsvped).toBe(true);
  });

  it("rejects duplicate RSVPs without changing the count", async () => {
    const event = await seedEvent();
    await rsvpEvent(event.id, event.organizerId);
    const second = await rsvpEvent(event.id, event.organizerId);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toMatch(/already/i);
    expect(await rsvpCount(event.id)).toBe(1);
  });

  it("enforces capacity", async () => {
    const event = await seedEvent({ capacity: 2 });
    asUser("user-1");
    await rsvpEvent(event.id, event.organizerId);
    asUser("user-2");
    await rsvpEvent(event.id, event.organizerId);
    asUser("user-3");
    const result = await rsvpEvent(event.id, event.organizerId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/capacity|full/i);
    expect(await rsvpCount(event.id)).toBe(2);
  });

  it("refuses RSVPs to unpublished events", async () => {
    const draft = await seedEvent({ status: "draft", publishedAt: null });
    const result = await rsvpEvent(draft.id, draft.organizerId);
    expect(result.ok).toBe(false);
  });

  it("survives concurrent RSVPs without losing updates", async () => {
    const event = await seedEvent();
    const users = Array.from({ length: 5 }, (_, i) => `user-${i}`);
    for (const uid of users) {
      asUser(uid);
      await rsvpEvent(event.id, event.organizerId);
    }
    expect(await rsvpCount(event.id)).toBe(5);
  });

  describe("cancelRsvp", () => {
    it("cancels and decrements exactly once", async () => {
      const event = await seedEvent();
      await rsvpEvent(event.id, event.organizerId);
      const cancel = await cancelRsvp(event.id, event.organizerId);
      expect(cancel.ok).toBe(true);
      expect(await rsvpCount(event.id)).toBe(0);

      const status = await getUserRsvpStatus(event.id, event.organizerId);
      expect(status.ok && status.data.isRsvped).toBe(false);
    });

    it("rejects cancelling an already-cancelled RSVP (no double decrement)", async () => {
      const event = await seedEvent();
      await rsvpEvent(event.id, event.organizerId);
      await cancelRsvp(event.id, event.organizerId);
      const second = await cancelRsvp(event.id, event.organizerId);
      expect(second.ok).toBe(false);
      expect(await rsvpCount(event.id)).toBe(0);
    });

    it("rejects cancelling when no RSVP exists", async () => {
      const event = await seedEvent();
      const result = await cancelRsvp(event.id, event.organizerId);
      expect(result.ok).toBe(false);
    });
  });

  it("allows re-RSVP after cancelling", async () => {
    const event = await seedEvent();
    await rsvpEvent(event.id, event.organizerId);
    await cancelRsvp(event.id, event.organizerId);
    const again = await rsvpEvent(event.id, event.organizerId);
    expect(again.ok).toBe(true);
    expect(await rsvpCount(event.id)).toBe(1);

    const status = await getUserRsvpStatus(event.id, event.organizerId);
    expect(status.ok && status.data.isRsvped).toBe(true);
  });

  describe("getMyRsvps", () => {
    it("lists only the current user's RSVPs, including cancelled ones", async () => {
      const a = await seedEvent({ id: "event-a" });
      const b = await seedEvent({ id: "event-b" });
      asUser("user-1");
      await rsvpEvent(a.id, a.organizerId);
      await rsvpEvent(b.id, b.organizerId);
      await cancelRsvp(b.id, b.organizerId);
      asUser("user-2");
      await rsvpEvent(a.id, a.organizerId);

      asUser("user-1");
      const result = await getMyRsvps();
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.rsvps).toHaveLength(2);
      const cancelled = result.data.rsvps.filter((r) => r.cancelledAt);
      expect(cancelled).toHaveLength(1);
      expect(result.data.rsvps.every((r) => r.userId === "user-1")).toBe(true);
    });

    it("includes an event snapshot for rendering", async () => {
      const event = await seedEvent({ title: "Snapshot Event" });
      await rsvpEvent(event.id, event.organizerId);
      const result = await getMyRsvps();
      if (!result.ok) throw new Error("expected ok");
      expect(result.data.rsvps[0].eventSnapshot?.title).toBe("Snapshot Event");
    });
  });

  describe("getEventAttendees", () => {
    it("returns active attendees with display names, organizer-only", async () => {
      const event = await seedEvent({ organizerId: "organizer-1" });
      asUser("user-1");
      await rsvpEvent(event.id, event.organizerId);
      asUser("user-2");
      await rsvpEvent(event.id, event.organizerId);
      await cancelRsvp(event.id, event.organizerId);

      asUser("organizer-1");
      const result = await getEventAttendees(event.id);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.attendees).toHaveLength(1);
      expect(result.data.attendees[0].userId).toBe("user-1");
      expect(result.data.attendees[0].displayName).toBeTruthy();
      expect(result.data.eventTitle).toBe(event.title);
    });

    it("refuses attendee lists for events the user does not organize", async () => {
      const event = await seedEvent({ organizerId: "organizer-1" });
      asUser("not-the-organizer");
      const result = await getEventAttendees(event.id);
      expect(result.ok).toBe(false);
    });
  });
});
