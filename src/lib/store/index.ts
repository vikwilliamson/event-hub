import { promises as fs } from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";
import type { Event, Rsvp, User } from "@/lib/types";
import { env } from "@/lib/env";

export interface StoreData {
  users: Record<string, User>;
  events: Record<string, Event>;
  rsvps: Record<string, Rsvp>;
}

/**
 * Minimal persistence seam. `mutate` runs callbacks one at a time (an async
 * queue), so a mutation sees every prior mutation's result — the local-store
 * equivalent of a transaction. `read` must not modify the data it receives.
 */
export interface Store {
  read<T>(fn: (data: StoreData) => T): Promise<T>;
  mutate<T>(fn: (data: StoreData) => T | Promise<T>): Promise<T>;
}

const emptyData = (): StoreData => ({ users: {}, events: {}, rsvps: {} });

/** Serializes async operations: each queued task starts after the previous settles. */
class TaskQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(task, task);
    this.tail = result.catch(() => undefined);
    return result;
  }
}

export class MemoryStore implements Store {
  private data: StoreData;
  private queue = new TaskQueue();

  constructor(initial?: Partial<StoreData>) {
    this.data = { ...emptyData(), ...initial };
  }

  read<T>(fn: (data: StoreData) => T): Promise<T> {
    return Promise.resolve(fn(this.data));
  }

  mutate<T>(fn: (data: StoreData) => T | Promise<T>): Promise<T> {
    return this.queue.run(async () => fn(this.data));
  }
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function reviveDates(key: string, value: unknown): unknown {
  if (typeof value === "string" && ISO_DATE_RE.test(value)) return new Date(value);
  return value;
}

export class JsonFileStore implements Store {
  private data: StoreData | null = null;
  private queue = new TaskQueue();

  constructor(private readonly filePath: string) {}

  private async load(): Promise<StoreData> {
    if (this.data) return this.data;
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      this.data = { ...emptyData(), ...(JSON.parse(raw, reviveDates) as StoreData) };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      this.data = emptyData();
    }
    return this.data;
  }

  private async persist(data: StoreData): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    const tmp = path.join(
      dir,
      `.${path.basename(this.filePath)}.${process.pid}.tmp`
    );
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmp, this.filePath); // atomic swap: readers never see a partial file
  }

  read<T>(fn: (data: StoreData) => T): Promise<T> {
    return this.queue.run(async () => fn(await this.load()));
  }

  mutate<T>(fn: (data: StoreData) => T | Promise<T>): Promise<T> {
    return this.queue.run(async () => {
      const data = await this.load();
      const result = await fn(data);
      await this.persist(data);
      return result;
    });
  }
}

/**
 * Minimal string get/set surface — the subset of the Upstash Redis REST client
 * KvStore needs. Kept as an interface so the store is testable with a fake.
 */
export interface KvClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
}

/**
 * Serverless-friendly store: the whole StoreData blob lives under one KV key.
 * Unlike JsonFileStore there is no long-lived in-memory cache — every read and
 * mutate loads fresh from KV, so writes from other instances are always seen
 * (a warm instance never serves stale data). Mutations are read-modify-write
 * with last-writer-wins, matching JsonFileStore's whole-file semantics.
 */
export class KvStore implements Store {
  private queue = new TaskQueue();

  constructor(
    private readonly kv: KvClient,
    private readonly key = "eventhub:store"
  ) {}

  private async load(): Promise<StoreData> {
    const raw = await this.kv.get(this.key);
    if (!raw) return emptyData();
    return { ...emptyData(), ...(JSON.parse(raw, reviveDates) as StoreData) };
  }

  read<T>(fn: (data: StoreData) => T): Promise<T> {
    return this.queue.run(async () => fn(await this.load()));
  }

  mutate<T>(fn: (data: StoreData) => T | Promise<T>): Promise<T> {
    return this.queue.run(async () => {
      const data = await this.load();
      const result = await fn(data);
      await this.kv.set(this.key, JSON.stringify(data));
      return result;
    });
  }
}

const DEFAULT_DATA_FILE = path.join(process.cwd(), "data", "eventhub-db.json");

// Survives Next.js dev-server module reloads; also the seam tests use to
// substitute a MemoryStore.
const globalStore = globalThis as { __eventhubStore?: Store | null };

export function getStore(): Store {
  if (!globalStore.__eventhubStore) {
    globalStore.__eventhubStore = createStore();
  }
  return globalStore.__eventhubStore;
}

/**
 * Picks the store backend from the environment: Vercel KV / Upstash Redis when
 * its REST credentials are present (required on serverless, where the local
 * JSON file is not writable), otherwise the local JSON file for dev and demos.
 */
function createStore(): Store {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    // automaticDeserialization: false → get/set exchange raw JSON strings so
    // KvStore controls Date revival, exactly as the file store does.
    const redis = new Redis({ url, token, automaticDeserialization: false });
    const kv: KvClient = {
      get: (key) => redis.get<string>(key),
      set: (key, value) => redis.set(key, value),
    };
    return new KvStore(kv);
  }
  return new JsonFileStore(env.EVENTHUB_DATA_FILE ?? DEFAULT_DATA_FILE);
}

export function setStore(store: Store | null): void {
  globalStore.__eventhubStore = store;
}
