import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { MemoryStore, JsonFileStore, type Store } from "@/lib/store";
import { makeEvent, makeUser } from "../factories/factories";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function storeContract(name: string, create: () => Store) {
  describe(`${name} (contract)`, () => {
    it("round-trips data through mutate and read", async () => {
      const store = create();
      const event = makeEvent({ id: "e1" });
      await store.mutate((data) => {
        data.events[event.id] = event;
      });
      const found = await store.read((data) => data.events["e1"]);
      expect(found.title).toBe(event.title);
    });

    it("serializes concurrent mutations (no lost updates)", async () => {
      const store = create();
      await store.mutate((data) => {
        data.events["e1"] = makeEvent({ id: "e1", rsvpCount: 0 });
      });
      await Promise.all(
        Array.from({ length: 20 }, () =>
          store.mutate(async (data) => {
            const current = data.events["e1"].rsvpCount;
            await sleep(1); // widen the race window
            data.events["e1"].rsvpCount = current + 1;
          })
        )
      );
      const count = await store.read((data) => data.events["e1"].rsvpCount);
      expect(count).toBe(20);
    });

    it("returns the mutate callback's result", async () => {
      const store = create();
      const result = await store.mutate((data) => {
        data.users["u1"] = makeUser({ id: "u1" });
        return "created";
      });
      expect(result).toBe("created");
    });
  });
}

storeContract("MemoryStore", () => new MemoryStore());

describe("JsonFileStore", () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "eventhub-store-"));
    file = path.join(dir, "db.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  storeContract("JsonFileStore", () => {
    // fresh path per contract test to avoid cross-test bleed
    const p = path.join(tmpdir(), `eventhub-contract-${Math.random().toString(36).slice(2)}.json`);
    return new JsonFileStore(p);
  });

  it("bootstraps empty when the file does not exist", async () => {
    const store = new JsonFileStore(file);
    const events = await store.read((data) => Object.keys(data.events));
    expect(events).toEqual([]);
  });

  it("persists across instances and revives dates", async () => {
    const startsAt = new Date("2027-03-01T18:00:00.000Z");
    const first = new JsonFileStore(file);
    await first.mutate((data) => {
      data.events["e1"] = makeEvent({ id: "e1", startsAt });
    });

    const second = new JsonFileStore(file);
    const revived = await second.read((data) => data.events["e1"]);
    expect(revived.startsAt).toBeInstanceOf(Date);
    expect(revived.startsAt.toISOString()).toBe(startsAt.toISOString());
    expect(revived.cancelledAt).toBeNull();
  });

  it("writes valid JSON to disk", async () => {
    const store = new JsonFileStore(file);
    await store.mutate((data) => {
      data.users["u1"] = makeUser({ id: "u1", displayName: "Disk User" });
    });
    const raw = JSON.parse(await readFile(file, "utf8"));
    expect(raw.users["u1"].displayName).toBe("Disk User");
  });
});
