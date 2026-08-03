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

import { createEvent } from "@/lib/actions/event.actions";
import { MemoryStore, setStore, getStore } from "@/lib/store";
import { makeEventPayload } from "../factories/factories";

describe("createEvent action", () => {
  beforeEach(() => {
    setStore(new MemoryStore());
    cookieState.uid = "organizer-1";
  });

  it("creates a published event owned by the session user", async () => {
    const result = await createEvent(makeEventPayload({ status: "published" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const stored = await getStore().read((d) => d.events[result.data.eventId]);
    expect(stored).toBeDefined();
    expect(stored.organizerId).toBe("organizer-1");
    expect(stored.status).toBe("published");
    expect(stored.publishedAt).toBeInstanceOf(Date);
    expect(stored.rsvpCount).toBe(0);
  });

  it("creates a draft without publishedAt", async () => {
    const result = await createEvent(makeEventPayload({ status: "draft" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const stored = await getStore().read((d) => d.events[result.data.eventId]);
    expect(stored.status).toBe("draft");
    expect(stored.publishedAt).toBeNull();
  });

  it("stores venue, category, and coordinates when provided", async () => {
    const result = await createEvent(
      makeEventPayload({
        venueName: "Union Station",
        category: "tech",
        lat: 39.7392,
        lng: -104.9903,
      })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const stored = await getStore().read((d) => d.events[result.data.eventId]);
    expect(stored.venueName).toBe("Union Station");
    expect(stored.category).toBe("tech");
    expect(stored.lat).toBeCloseTo(39.7392);
    expect(stored.lng).toBeCloseTo(-104.9903);
  });

  it("returns field errors for an invalid payload", async () => {
    const result = await createEvent(makeEventPayload({ title: "" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors?.title).toBeDefined();
  });

  it("rejects when there is no session identity", async () => {
    cookieState.uid = null;
    const result = await createEvent(makeEventPayload());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/session|identity|auth/i);
  });
});
