import { describe, it, expect, beforeEach } from "vitest";
import { vi } from "vitest";

const cookieState = vi.hoisted(() => ({ uid: null as string | null }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "eh_uid" && cookieState.uid ? { value: cookieState.uid } : undefined,
  }),
}));

import {
  getDemoSession,
  getOrCreateSessionUser,
  displayNameForUid,
} from "@/lib/session";
import { MemoryStore, setStore, getStore } from "@/lib/store";

describe("demo session", () => {
  beforeEach(() => {
    setStore(new MemoryStore());
    cookieState.uid = null;
  });

  it("returns null when no identity cookie is present", async () => {
    expect(await getDemoSession()).toBeNull();
  });

  it("returns the uid from the identity cookie", async () => {
    cookieState.uid = "uid-abc";
    expect(await getDemoSession()).toEqual({ uid: "uid-abc" });
  });

  it("generates a deterministic, human-friendly display name per uid", () => {
    const a = displayNameForUid("uid-abc");
    const b = displayNameForUid("uid-abc");
    const c = displayNameForUid("uid-xyz");
    expect(a).toBe(b);
    expect(a).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
    expect(a).not.toBe(c);
  });

  it("creates the user record on first use and is idempotent", async () => {
    cookieState.uid = "uid-abc";
    const first = await getOrCreateSessionUser();
    const second = await getOrCreateSessionUser();
    expect(first).not.toBeNull();
    expect(first!.id).toBe("uid-abc");
    expect(first!.displayName).toBe(displayNameForUid("uid-abc"));
    expect(second!.createdAt.toISOString()).toBe(first!.createdAt.toISOString());
    const count = await getStore().read((d) => Object.keys(d.users).length);
    expect(count).toBe(1);
  });

  it("returns null user when no cookie is present", async () => {
    expect(await getOrCreateSessionUser()).toBeNull();
  });
});
