import { describe, it, expect } from "vitest";
import { KvStore, type KvClient } from "@/lib/store";
import { makeEvent } from "../factories/factories";

/** In-memory stand-in for the Upstash Redis REST client (string get/set). */
class FakeKv implements KvClient {
  store = new Map<string, string>();
  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  async set(key: string, value: string): Promise<unknown> {
    this.store.set(key, value);
    return "OK";
  }
}

describe("KvStore", () => {
  it("reads empty data when the key is absent", async () => {
    const store = new KvStore(new FakeKv());
    const data = await store.read((d) => d);
    expect(data).toEqual({ users: {}, events: {}, rsvps: {} });
  });

  it("persists mutations to the KV blob", async () => {
    const kv = new FakeKv();
    const store = new KvStore(kv);
    const event = makeEvent({ id: "e1", title: "KV Test Event" });

    await store.mutate((d) => {
      d.events[event.id] = event;
    });

    // A fresh store over the same KV (i.e. a different serverless instance)
    // sees the write — there is no stale in-memory cache.
    const other = new KvStore(kv);
    const title = await other.read((d) => d.events["e1"]?.title);
    expect(title).toBe("KV Test Event");
  });

  it("revives Date fields on read (not left as ISO strings)", async () => {
    const kv = new FakeKv();
    const store = new KvStore(kv);
    await store.mutate((d) => {
      d.events["e1"] = makeEvent({ id: "e1" });
    });

    const startsAt = await store.read((d) => d.events["e1"].startsAt);
    expect(startsAt).toBeInstanceOf(Date);
  });

  it("serializes concurrent mutations without losing updates", async () => {
    const store = new KvStore(new FakeKv());
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        store.mutate((d) => {
          d.events[`e${i}`] = makeEvent({ id: `e${i}` });
        })
      )
    );
    const count = await store.read((d) => Object.keys(d.events).length);
    expect(count).toBe(5);
  });
});
