import { describe, it, expect, beforeEach } from "vitest";
import { getAllPublishedEvents, findEventById } from "@/lib/events-public";
import { MemoryStore, setStore, getStore } from "@/lib/store";
import { makeEvent, daysFromNow } from "../factories/factories";

describe("public event reads", () => {
  beforeEach(() => {
    setStore(new MemoryStore());
  });

  async function seed(overrides = {}) {
    const event = makeEvent(overrides);
    await getStore().mutate((d) => {
      d.events[event.id] = event;
    });
    return event;
  }

  it("lists only published events, soonest first", async () => {
    await seed({ id: "later", startsAt: daysFromNow(10) });
    await seed({ id: "sooner", startsAt: daysFromNow(2) });
    await seed({ id: "draft", status: "draft" });
    await seed({ id: "cancelled", status: "cancelled", cancelledAt: new Date() });

    const events = await getAllPublishedEvents();
    expect(events.map((e) => e.id)).toEqual(["sooner", "later"]);
  });

  it("finds a published event by id with its organizerId", async () => {
    const event = await seed({ organizerId: "org-42" });
    const found = await findEventById(event.id);
    expect(found).not.toBeNull();
    expect(found!.event.id).toBe(event.id);
    expect(found!.organizerId).toBe("org-42");
  });

  it("hides drafts and returns null for missing ids", async () => {
    const draft = await seed({ status: "draft" });
    expect(await findEventById(draft.id)).toBeNull();
    expect(await findEventById("does-not-exist")).toBeNull();
  });
});
