import { cookies } from "next/headers";
import { getStore } from "@/lib/store";
import type { User } from "@/lib/types";

/**
 * Frictionless demo identity: middleware mints an `eh_uid` cookie on first
 * visit; every visitor is implicitly "signed in" as a local user who can both
 * organize events and RSVP. No auth provider involved.
 */
export const DEMO_UID_COOKIE = "eh_uid";

export type DemoSession = { uid: string };

export async function getDemoSession(): Promise<DemoSession | null> {
  const cookieStore = await cookies();
  const uid = cookieStore.get(DEMO_UID_COOKIE)?.value;
  return uid ? { uid } : null;
}

const ADJECTIVES = [
  "Curious",
  "Bright",
  "Mellow",
  "Swift",
  "Sunny",
  "Bold",
  "Quiet",
  "Lively",
  "Clever",
  "Gentle",
  "Daring",
  "Cheerful",
];

const ANIMALS = [
  "Falcon",
  "Otter",
  "Lynx",
  "Heron",
  "Badger",
  "Dolphin",
  "Marmot",
  "Kestrel",
  "Fox",
  "Ibex",
  "Puffin",
  "Wombat",
];

/** Deterministic, human-friendly name derived from the uid. */
export function displayNameForUid(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  }
  const adjective = ADJECTIVES[hash % ADJECTIVES.length];
  const animal = ANIMALS[Math.floor(hash / ADJECTIVES.length) % ANIMALS.length];
  return `${adjective} ${animal}`;
}

/**
 * Resolve the current visitor to a stored User, creating the record on first
 * use. Returns null only when no identity cookie exists (middleware normally
 * guarantees one).
 */
export async function getOrCreateSessionUser(): Promise<User | null> {
  const session = await getDemoSession();
  if (!session) return null;

  return getStore().mutate((data) => {
    const existing = data.users[session.uid];
    if (existing) return existing;
    const user: User = {
      id: session.uid,
      displayName: displayNameForUid(session.uid),
      createdAt: new Date(),
    };
    data.users[session.uid] = user;
    return user;
  });
}
