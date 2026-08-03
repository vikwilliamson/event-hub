import { promises as fs } from "node:fs";
import path from "node:path";
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

const DEFAULT_DATA_FILE = path.join(process.cwd(), "data", "eventhub-db.json");

// Survives Next.js dev-server module reloads; also the seam tests use to
// substitute a MemoryStore.
const globalStore = globalThis as { __eventhubStore?: Store | null };

export function getStore(): Store {
  if (!globalStore.__eventhubStore) {
    globalStore.__eventhubStore = new JsonFileStore(
      env.EVENTHUB_DATA_FILE ?? DEFAULT_DATA_FILE
    );
  }
  return globalStore.__eventhubStore;
}

export function setStore(store: Store | null): void {
  globalStore.__eventhubStore = store;
}
