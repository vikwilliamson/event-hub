# EventHub — Firestore Security Rules Test Plan

**Version:** 1.0 · **Depends on:** Security Rules v1.0, Data Model v1.0 · **Status:** Draft

---

## 1. Strategy

### What we're testing

Security Rules are pure logic — they map `(request, resource, path)` to `allow` or `deny`. The test suite must exhaustively cover:

1. **Happy paths** — legitimate operations that must succeed
2. **Ownership boundaries** — authenticated users who own the resource vs those who don't
3. **Unauthenticated access** — no token at all
4. **Privilege escalation** — crafted writes designed to bypass field-level guards
5. **State machine enforcement** — invalid status transitions

### What we're not testing here

- RSVP transaction logic (capacity enforcement, idempotency) — that's integration-tested in `tests/integration/rsvp.actions.test.ts` against the emulator via Server Actions
- Email delivery — unit-tested with a mock provider
- Server Action input validation — Zod schema unit tests

### Test environment

```
Firebase Emulator Suite (Firestore only)
@firebase/rules-unit-testing v3
Vitest (test runner, Jest-compatible API)
```

Rules tests run in complete isolation: each test gets a clean Firestore state via `env.clearFirestore()` in `afterEach`. No test depends on another.

### File layout

```
tests/
└── rules/
    ├── helpers.ts          ← shared fixtures + typed context factories
    ├── users.rules.test.ts
    ├── organizers.rules.test.ts
    ├── events.rules.test.ts
    └── rsvps.rules.test.ts
```

---

## 2. Setup & Shared Helpers

```ts
// tests/rules/helpers.ts

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
  RulesTestContext,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { resolve } from "path";
import { Timestamp } from "firebase/firestore";

// ── Environment singleton ───────────────────────────────────────────────────

export let env: RulesTestEnvironment;

export async function setupEnv() {
  env = await initializeTestEnvironment({
    projectId: "eventhub-rules-test",
    firestore: {
      rules: readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8"),
      host: "localhost",
      port: 8080,
    },
  });
}

export async function teardownEnv() {
  await env.cleanup();
}

// ── Context factories ───────────────────────────────────────────────────────

export const OWNER_UID = "org-owner-uid";
export const OTHER_UID = "other-org-uid";
export const ATTACKER_UID = "attacker-uid";

export const asOwner = () => env.authenticatedContext(OWNER_UID);
export const asOther = () => env.authenticatedContext(OTHER_UID);
export const asAttacker = () => env.authenticatedContext(ATTACKER_UID);
export const asAnonymous = () => env.unauthenticatedContext();

// ── Typed fixture factories ─────────────────────────────────────────────────
// These produce the minimum valid document shape for each collection.
// Override individual fields in tests to exercise specific conditions.

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 days
const PAST_DATE = new Date(Date.now() - 24 * 60 * 60 * 1000); // -1 day
const NOW = new Date();

export function makeUserDoc(overrides: Partial<UserDoc> = {}): UserDoc {
  return {
    uid: OWNER_UID,
    email: "owner@example.com",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function makeOrganizerDoc(
  overrides: Partial<OrganizerDoc> = {},
): OrganizerDoc {
  return {
    uid: OWNER_UID,
    displayName: "Test Organizer",
    email: "owner@example.com",
    eventCount: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function makeEventDoc(overrides: Partial<EventDoc> = {}): EventDoc {
  return {
    id: "evt-1",
    organizerId: OWNER_UID,
    organizerName: "Test Organizer",
    title: "My Test Event",
    description: "A valid description for testing.",
    location: "Online",
    startsAt: FUTURE_DATE,
    endsAt: null,
    capacity: null,
    rsvpCount: 0,
    status: "published",
    visibility: "public",
    createdAt: NOW,
    updatedAt: NOW,
    cancelledAt: null,
    publishedAt: NOW,
    ...overrides,
  };
}

export function makeRsvpDoc(overrides: Partial<RsvpDoc> = {}): RsvpDoc {
  return {
    id: "rsvp-1",
    eventId: "evt-1",
    organizerId: OWNER_UID,
    attendeeName: "Jane Doe",
    attendeeEmail: "jane@example.com",
    cancelToken: "tok_abc123",
    cancelTokenExpiresAt: FUTURE_DATE,
    status: "confirmed",
    createdAt: NOW,
    updatedAt: NOW,
    cancelledAt: null,
    ...overrides,
  };
}

// ── Seeding helpers ─────────────────────────────────────────────────────────
// Use Admin SDK (bypasses rules) to seed prerequisite documents before
// testing rules on other operations.

export async function seedEvent(
  eventId = "evt-1",
  data: Partial<EventDoc> = {},
) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx
      .firestore()
      .doc(`organizers/${OWNER_UID}/events/${eventId}`)
      .set(makeEventDoc({ id: eventId, ...data }));
  });
}

export async function seedRsvp(
  eventId = "evt-1",
  rsvpId = "rsvp-1",
  data: Partial<RsvpDoc> = {},
) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx
      .firestore()
      .doc(`organizers/${OWNER_UID}/events/${eventId}/rsvps/${rsvpId}`)
      .set(makeRsvpDoc({ id: rsvpId, eventId, ...data }));
  });
}

// Minimal types for this file — the real types live in src/types/
interface UserDoc {
  uid: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}
interface OrganizerDoc {
  uid: string;
  displayName: string;
  email: string;
  eventCount: number;
  createdAt: Date;
  updatedAt: Date;
}
interface EventDoc {
  id: string;
  organizerId: string;
  organizerName: string;
  title: string;
  description: string;
  location: string;
  startsAt: Date;
  endsAt: Date | null;
  capacity: number | null;
  rsvpCount: number;
  status: string;
  visibility: string;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  publishedAt: Date | null;
}
interface RsvpDoc {
  id: string;
  eventId: string;
  organizerId: string;
  attendeeName: string;
  attendeeEmail: string;
  cancelToken: string;
  cancelTokenExpiresAt: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
}

export { FUTURE_DATE, PAST_DATE, NOW };
```

---

## 3. Test Matrix

The matrix maps every rule surface to its test cases before a line of test code is written. `✓ = assertSucceeds`, `✗ = assertFails`.

### 3.1 `/users/{userId}`

| #    | Operation | Actor                    | Condition                      | Expected |
| ---- | --------- | ------------------------ | ------------------------------ | -------- |
| U-01 | read      | Owner                    | own document                   | ✓        |
| U-02 | read      | Other authenticated user | someone else's document        | ✗        |
| U-03 | read      | Anonymous                | any document                   | ✗        |
| U-04 | update    | Owner                    | only `updatedAt` field         | ✓        |
| U-05 | update    | Owner                    | attempts to change `email`     | ✗        |
| U-06 | update    | Owner                    | attempts to change `uid`       | ✗        |
| U-07 | update    | Owner                    | attempts to change `createdAt` | ✗        |
| U-08 | update    | Other authenticated user | someone else's document        | ✗        |
| U-09 | create    | Any authenticated user   | any data                       | ✗        |
| U-10 | delete    | Owner                    | own document                   | ✗        |

### 3.2 `/organizers/{userId}`

| #    | Operation | Actor                    | Condition                        | Expected |
| ---- | --------- | ------------------------ | -------------------------------- | -------- |
| O-01 | read      | Owner                    | own organizer document           | ✓        |
| O-02 | read      | Other authenticated user | someone else's organizer doc     | ✗        |
| O-03 | read      | Anonymous                | any organizer document           | ✗        |
| O-04 | update    | Owner                    | only `displayName` + `updatedAt` | ✓        |
| O-05 | update    | Owner                    | attempts to change `eventCount`  | ✗        |
| O-06 | update    | Owner                    | attempts to change `email`       | ✗        |
| O-07 | update    | Owner                    | attempts to change `uid`         | ✗        |
| O-08 | update    | Other authenticated user | someone else's organizer doc     | ✗        |
| O-09 | create    | Any user                 | any data                         | ✗        |
| O-10 | delete    | Owner                    | own document                     | ✗        |

### 3.3 `/organizers/{userId}/events/{eventId}`

| #    | Operation | Actor                    | Condition                                   | Expected |
| ---- | --------- | ------------------------ | ------------------------------------------- | -------- |
| E-01 | read      | Anonymous                | published event                             | ✓        |
| E-02 | read      | Other authenticated user | published event                             | ✓        |
| E-03 | read      | Anonymous                | draft event                                 | ✗        |
| E-04 | read      | Other authenticated user | draft event                                 | ✗        |
| E-05 | read      | Owner                    | own draft event                             | ✓        |
| E-06 | read      | Owner                    | own cancelled event                         | ✓        |
| E-07 | create    | Owner                    | valid published event, all fields correct   | ✓        |
| E-08 | create    | Owner                    | valid draft event                           | ✓        |
| E-09 | create    | Anonymous                | any event                                   | ✗        |
| E-10 | create    | Other authenticated user | under owner's path                          | ✗        |
| E-11 | create    | Owner                    | `organizerId` doesn't match UID             | ✗        |
| E-12 | create    | Owner                    | `id` field doesn't match document ID        | ✗        |
| E-13 | create    | Owner                    | `rsvpCount` > 0                             | ✗        |
| E-14 | create    | Owner                    | `status = 'cancelled'`                      | ✗        |
| E-15 | create    | Owner                    | `startsAt` is in the past                   | ✗        |
| E-16 | create    | Owner                    | `title` is empty string                     | ✗        |
| E-17 | create    | Owner                    | `title` > 100 chars                         | ✗        |
| E-18 | update    | Owner                    | change title only (published → published)   | ✓        |
| E-19 | update    | Owner                    | draft → published transition                | ✓        |
| E-20 | update    | Owner                    | published → cancelled (with `cancelledAt`)  | ✓        |
| E-21 | update    | Owner                    | published → cancelled without `cancelledAt` | ✗        |
| E-22 | update    | Owner                    | cancelled → published (resurrection)        | ✗        |
| E-23 | update    | Owner                    | attempts to change `organizerId`            | ✗        |
| E-24 | update    | Owner                    | attempts to change `rsvpCount`              | ✗        |
| E-25 | update    | Owner                    | attempts to change `createdAt`              | ✗        |
| E-26 | update    | Other authenticated user | any field                                   | ✗        |
| E-27 | update    | Anonymous                | any field                                   | ✗        |
| E-28 | delete    | Owner                    | own event                                   | ✗        |
| E-29 | delete    | Anonymous                | any event                                   | ✗        |

### 3.4 `/organizers/{userId}/events/{eventId}/rsvps/{rsvpId}`

| #    | Operation | Actor                    | Condition                 | Expected |
| ---- | --------- | ------------------------ | ------------------------- | -------- |
| R-01 | read      | Owner (organizer)        | own event's RSVPs         | ✓        |
| R-02 | read      | Other authenticated user | another organizer's RSVPs | ✗        |
| R-03 | read      | Anonymous                | any RSVP                  | ✗        |
| R-04 | create    | Owner (organizer)        | any data                  | ✗        |
| R-05 | create    | Anonymous                | any data                  | ✗        |
| R-06 | create    | Other authenticated user | any data                  | ✗        |
| R-07 | update    | Owner (organizer)        | any field                 | ✗        |
| R-08 | delete    | Owner (organizer)        | own event's RSVP          | ✗        |

**Total: 47 test cases.** Every rule branch is covered by at least one allow and one deny test.

---

## 4. Test Implementations

```ts
// tests/rules/users.rules.test.ts

import { describe, it, beforeAll, afterAll, afterEach } from "vitest";
import { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import {
  setupEnv,
  teardownEnv,
  env,
  asOwner,
  asOther,
  asAnonymous,
  makeUserDoc,
  OWNER_UID,
  OTHER_UID,
} from "./helpers";

beforeAll(setupEnv);
afterAll(teardownEnv);
afterEach(() => env.clearFirestore());

describe("/users/{userId}", () => {
  // ── Reads ─────────────────────────────────────────────────────

  it("U-01: owner can read own user document", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc(`users/${OWNER_UID}`).set(makeUserDoc());
    });

    const db = asOwner().firestore();
    await assertSucceeds(getDoc(doc(db, "users", OWNER_UID)));
  });

  it("U-02: authenticated non-owner cannot read another user document", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc(`users/${OWNER_UID}`).set(makeUserDoc());
    });

    const db = asOther().firestore();
    await assertFails(getDoc(doc(db, "users", OWNER_UID)));
  });

  it("U-03: anonymous user cannot read any user document", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc(`users/${OWNER_UID}`).set(makeUserDoc());
    });

    const db = asAnonymous().firestore();
    await assertFails(getDoc(doc(db, "users", OWNER_UID)));
  });

  // ── Updates ───────────────────────────────────────────────────

  it("U-04: owner can update only updatedAt", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc(`users/${OWNER_UID}`).set(makeUserDoc());
    });

    const db = asOwner().firestore();
    await assertSucceeds(
      updateDoc(doc(db, "users", OWNER_UID), { updatedAt: new Date() }),
    );
  });

  it("U-05: owner cannot change email", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc(`users/${OWNER_UID}`).set(makeUserDoc());
    });

    const db = asOwner().firestore();
    await assertFails(
      updateDoc(doc(db, "users", OWNER_UID), {
        email: "newemail@example.com",
        updatedAt: new Date(),
      }),
    );
  });

  it("U-06: owner cannot change uid", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc(`users/${OWNER_UID}`).set(makeUserDoc());
    });

    const db = asOwner().firestore();
    await assertFails(
      updateDoc(doc(db, "users", OWNER_UID), {
        uid: "a-different-uid",
        updatedAt: new Date(),
      }),
    );
  });

  it("U-07: owner cannot change createdAt", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc(`users/${OWNER_UID}`).set(makeUserDoc());
    });

    const db = asOwner().firestore();
    await assertFails(
      updateDoc(doc(db, "users", OWNER_UID), {
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  });

  it("U-08: another authenticated user cannot update someone elses document", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc(`users/${OWNER_UID}`).set(makeUserDoc());
    });

    const db = asOther().firestore();
    await assertFails(
      updateDoc(doc(db, "users", OWNER_UID), { updatedAt: new Date() }),
    );
  });

  // ── Creates & Deletes ─────────────────────────────────────────

  it("U-09: no authenticated user can create a user document", async () => {
    const db = asOwner().firestore();
    await assertFails(setDoc(doc(db, "users", OWNER_UID), makeUserDoc()));
  });

  it("U-10: owner cannot delete own user document", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc(`users/${OWNER_UID}`).set(makeUserDoc());
    });

    const db = asOwner().firestore();
    await assertFails(deleteDoc(doc(db, "users", OWNER_UID)));
  });
});
```

```ts
// tests/rules/events.rules.test.ts

import { describe, it, beforeAll, afterAll, afterEach } from "vitest";
import { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import {
  setupEnv,
  teardownEnv,
  env,
  asOwner,
  asOther,
  asAnonymous,
  makeEventDoc,
  seedEvent,
  OWNER_UID,
  FUTURE_DATE,
  PAST_DATE,
  NOW,
} from "./helpers";

beforeAll(setupEnv);
afterAll(teardownEnv);
afterEach(() => env.clearFirestore());

const eventPath = (id = "evt-1") => `organizers/${OWNER_UID}/events/${id}`;

describe("/organizers/{userId}/events/{eventId} — reads", () => {
  it("E-01: anonymous user can read a published event", async () => {
    await seedEvent("evt-1", { status: "published" });
    const db = asAnonymous().firestore();
    await assertSucceeds(getDoc(doc(db, eventPath())));
  });

  it("E-02: other authenticated user can read a published event", async () => {
    await seedEvent("evt-1", { status: "published" });
    const db = asOther().firestore();
    await assertSucceeds(getDoc(doc(db, eventPath())));
  });

  it("E-03: anonymous user cannot read a draft event", async () => {
    await seedEvent("evt-1", { status: "draft", publishedAt: null });
    const db = asAnonymous().firestore();
    await assertFails(getDoc(doc(db, eventPath())));
  });

  it("E-04: other authenticated user cannot read a draft event", async () => {
    await seedEvent("evt-1", { status: "draft", publishedAt: null });
    const db = asOther().firestore();
    await assertFails(getDoc(doc(db, eventPath())));
  });

  it("E-05: owner can read own draft event", async () => {
    await seedEvent("evt-1", { status: "draft", publishedAt: null });
    const db = asOwner().firestore();
    await assertSucceeds(getDoc(doc(db, eventPath())));
  });

  it("E-06: owner can read own cancelled event", async () => {
    await seedEvent("evt-1", { status: "cancelled", cancelledAt: NOW });
    const db = asOwner().firestore();
    await assertSucceeds(getDoc(doc(db, eventPath())));
  });
});

describe("/organizers/{userId}/events/{eventId} — creates", () => {
  it("E-07: owner can create a valid published event", async () => {
    const db = asOwner().firestore();
    await assertSucceeds(
      setDoc(doc(db, eventPath()), makeEventDoc({ status: "published" })),
    );
  });

  it("E-08: owner can create a valid draft event", async () => {
    const db = asOwner().firestore();
    await assertSucceeds(
      setDoc(
        doc(db, eventPath()),
        makeEventDoc({ status: "draft", publishedAt: null }),
      ),
    );
  });

  it("E-09: anonymous user cannot create any event", async () => {
    const db = asAnonymous().firestore();
    await assertFails(setDoc(doc(db, eventPath()), makeEventDoc()));
  });

  it("E-10: authenticated non-owner cannot create event under another organizer path", async () => {
    // attacker's auth UID is OTHER_UID, but they're writing to OWNER_UID's path
    const db = asOther().firestore();
    await assertFails(setDoc(doc(db, eventPath()), makeEventDoc()));
  });

  it("E-11: owner cannot create event with mismatched organizerId", async () => {
    const db = asOwner().firestore();
    await assertFails(
      setDoc(
        doc(db, eventPath()),
        makeEventDoc({ organizerId: "some-other-uid" }),
        // organizerId != OWNER_UID (the auth UID) → denied
      ),
    );
  });

  it("E-12: owner cannot create event where id field mismatches document ID", async () => {
    const db = asOwner().firestore();
    await assertFails(
      setDoc(
        doc(db, eventPath("evt-1")),
        makeEventDoc({ id: "evt-WRONG" }),
        // id field 'evt-WRONG' != document ID 'evt-1' → denied
      ),
    );
  });

  it("E-13: owner cannot create event with rsvpCount > 0", async () => {
    const db = asOwner().firestore();
    await assertFails(
      setDoc(doc(db, eventPath()), makeEventDoc({ rsvpCount: 10 })),
    );
  });

  it("E-14: owner cannot create event with status = cancelled", async () => {
    const db = asOwner().firestore();
    await assertFails(
      setDoc(
        doc(db, eventPath()),
        makeEventDoc({ status: "cancelled", cancelledAt: NOW }),
      ),
    );
  });

  it("E-15: owner cannot create event with past startsAt", async () => {
    const db = asOwner().firestore();
    await assertFails(
      setDoc(doc(db, eventPath()), makeEventDoc({ startsAt: PAST_DATE })),
    );
  });

  it("E-16: owner cannot create event with empty title", async () => {
    const db = asOwner().firestore();
    await assertFails(
      setDoc(doc(db, eventPath()), makeEventDoc({ title: "" })),
    );
  });

  it("E-17: owner cannot create event with title longer than 100 characters", async () => {
    const db = asOwner().firestore();
    await assertFails(
      setDoc(doc(db, eventPath()), makeEventDoc({ title: "A".repeat(101) })),
    );
  });
});

describe("/organizers/{userId}/events/{eventId} — updates", () => {
  it("E-18: owner can update the title of a published event", async () => {
    await seedEvent("evt-1", { status: "published" });
    const db = asOwner().firestore();
    await assertSucceeds(
      updateDoc(doc(db, eventPath()), {
        title: "Updated Title",
        updatedAt: new Date(),
      }),
    );
  });

  it("E-19: owner can transition event from draft to published", async () => {
    await seedEvent("evt-1", { status: "draft", publishedAt: null });
    const db = asOwner().firestore();
    await assertSucceeds(
      updateDoc(doc(db, eventPath()), {
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  });

  it("E-20: owner can cancel a published event (with cancelledAt set)", async () => {
    await seedEvent("evt-1", { status: "published" });
    const db = asOwner().firestore();
    await assertSucceeds(
      updateDoc(doc(db, eventPath()), {
        status: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  });

  it("E-21: owner cannot cancel event without setting cancelledAt", async () => {
    await seedEvent("evt-1", { status: "published" });
    const db = asOwner().firestore();
    await assertFails(
      updateDoc(doc(db, eventPath()), {
        status: "cancelled",
        // cancelledAt intentionally omitted
        updatedAt: new Date(),
      }),
    );
  });

  it("E-22: owner cannot resurrect a cancelled event", async () => {
    await seedEvent("evt-1", { status: "cancelled", cancelledAt: NOW });
    const db = asOwner().firestore();
    await assertFails(
      updateDoc(doc(db, eventPath()), {
        status: "published",
        cancelledAt: null,
        updatedAt: new Date(),
      }),
    );
  });

  it("E-23: owner cannot change organizerId on update", async () => {
    await seedEvent("evt-1", { status: "published" });
    const db = asOwner().firestore();
    await assertFails(
      updateDoc(doc(db, eventPath()), {
        organizerId: "injected-uid",
        updatedAt: new Date(),
      }),
    );
  });

  it("E-24: owner cannot directly change rsvpCount", async () => {
    await seedEvent("evt-1", { status: "published", rsvpCount: 0 });
    const db = asOwner().firestore();
    await assertFails(
      updateDoc(doc(db, eventPath()), {
        rsvpCount: 999,
        updatedAt: new Date(),
      }),
    );
  });

  it("E-25: owner cannot change createdAt", async () => {
    await seedEvent("evt-1", { status: "published" });
    const db = asOwner().firestore();
    await assertFails(
      updateDoc(doc(db, eventPath()), {
        createdAt: new Date(2020, 1, 1), // backdated
        updatedAt: new Date(),
      }),
    );
  });

  it("E-26: non-owner authenticated user cannot update any event field", async () => {
    await seedEvent("evt-1", { status: "published" });
    const db = asOther().firestore();
    await assertFails(
      updateDoc(doc(db, eventPath()), {
        title: "Hijacked Title",
        updatedAt: new Date(),
      }),
    );
  });

  it("E-27: anonymous user cannot update any event field", async () => {
    await seedEvent("evt-1", { status: "published" });
    const db = asAnonymous().firestore();
    await assertFails(
      updateDoc(doc(db, eventPath()), {
        title: "Anonymous Hijack",
        updatedAt: new Date(),
      }),
    );
  });
});

describe("/organizers/{userId}/events/{eventId} — deletes", () => {
  it("E-28: owner cannot delete their own event", async () => {
    await seedEvent("evt-1");
    const db = asOwner().firestore();
    await assertFails(deleteDoc(doc(db, eventPath())));
  });

  it("E-29: anonymous user cannot delete any event", async () => {
    await seedEvent("evt-1");
    const db = asAnonymous().firestore();
    await assertFails(deleteDoc(doc(db, eventPath())));
  });
});
```

```ts
// tests/rules/rsvps.rules.test.ts

import { describe, it, beforeAll, afterAll, afterEach } from "vitest";
import { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import {
  setupEnv,
  teardownEnv,
  env,
  asOwner,
  asOther,
  asAnonymous,
  makeRsvpDoc,
  seedEvent,
  seedRsvp,
  OWNER_UID,
} from "./helpers";

beforeAll(setupEnv);
afterAll(teardownEnv);
afterEach(() => env.clearFirestore());

const rsvpPath = (eventId = "evt-1", rsvpId = "rsvp-1") =>
  `organizers/${OWNER_UID}/events/${eventId}/rsvps/${rsvpId}`;

describe("/rsvps/{rsvpId} — reads", () => {
  it("R-01: organizer can read RSVPs for their own event", async () => {
    await seedEvent();
    await seedRsvp();
    const db = asOwner().firestore();
    await assertSucceeds(getDoc(doc(db, rsvpPath())));
  });

  it("R-02: other authenticated user cannot read RSVPs for an event they do not own", async () => {
    await seedEvent();
    await seedRsvp();
    const db = asOther().firestore();
    await assertFails(getDoc(doc(db, rsvpPath())));
  });

  it("R-03: anonymous user cannot read any RSVP", async () => {
    await seedEvent();
    await seedRsvp();
    const db = asAnonymous().firestore();
    await assertFails(getDoc(doc(db, rsvpPath())));
  });
});

describe("/rsvps/{rsvpId} — writes (all must be denied)", () => {
  it("R-04: organizer cannot create an RSVP via client SDK", async () => {
    await seedEvent();
    const db = asOwner().firestore();
    await assertFails(setDoc(doc(db, rsvpPath()), makeRsvpDoc()));
  });

  it("R-05: anonymous user cannot create an RSVP via client SDK", async () => {
    await seedEvent();
    const db = asAnonymous().firestore();
    await assertFails(setDoc(doc(db, rsvpPath()), makeRsvpDoc()));
  });

  it("R-06: other authenticated user cannot create an RSVP via client SDK", async () => {
    await seedEvent();
    const db = asOther().firestore();
    await assertFails(setDoc(doc(db, rsvpPath()), makeRsvpDoc()));
  });

  it("R-07: organizer cannot update an RSVP via client SDK", async () => {
    await seedEvent();
    await seedRsvp();
    const db = asOwner().firestore();
    await assertFails(
      updateDoc(doc(db, rsvpPath()), {
        status: "cancelled",
        updatedAt: new Date(),
      }),
    );
  });

  it("R-08: organizer cannot delete an RSVP via client SDK", async () => {
    await seedEvent();
    await seedRsvp();
    const db = asOwner().firestore();
    await assertFails(deleteDoc(doc(db, rsvpPath())));
  });
});
```

---

## 5. Vitest Config for Rules Tests

```ts
// vitest.config.rules.ts
// Separate config so rules tests can run independently of unit tests.
// Usage: vitest --config vitest.config.rules.ts

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "rules",
    include: ["tests/rules/**/*.test.ts"],
    environment: "node",
    // Rules tests are serial — the emulator is a shared external process.
    // Parallel execution causes flaky teardown race conditions.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    globalSetup: "./tests/rules/global-setup.ts",
    testTimeout: 15_000, // emulator cold-start can be slow in CI
  },
});
```

```ts
// tests/rules/global-setup.ts
// Confirms the Firestore emulator is reachable before any test runs.
// Tests are expected to run under: firebase emulators:exec "vitest --config ..."

export async function setup() {
  const host = process.env.FIRESTORE_EMULATOR_HOST ?? "localhost:8080";
  try {
    await fetch(`http://${host}/`);
  } catch {
    throw new Error(
      `Firestore emulator not reachable at ${host}.\n` +
        `Start it with: firebase emulators:start --only firestore`,
    );
  }
}
```

---

## 6. CI Integration

```yaml
# .github/workflows/rules-tests.yml

name: Firestore Rules Tests

on:
  pull_request:
    paths:
      - "firestore.rules"
      - "tests/rules/**"

jobs:
  rules:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Install Firebase CLI
        run: npm install -g firebase-tools

      - name: Run rules tests with emulator
        run: |
          firebase emulators:exec \
            --only firestore \
            --project eventhub-rules-test \
            "npx vitest --config vitest.config.rules.ts --run"

      - name: Upload emulator logs on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: emulator-logs
          path: .firebase/logs/
```

**Trigger strategy:** Rules tests run only when `firestore.rules` or `tests/rules/**` changes. There is no reason to run them on every commit if neither the rules nor the tests changed. This keeps CI fast.

---

## 7. Coverage Gaps & What Requires Other Test Types

Rules tests only verify whether Firestore grants or denies operations. They cannot test:

| Gap                                         | Where it is tested instead                            |
| ------------------------------------------- | ----------------------------------------------------- |
| Capacity enforcement (transaction)          | Integration: `tests/integration/rsvp.actions.test.ts` |
| Cancel token HMAC validity                  | Unit: `tests/unit/lib/tokens/cancel-token.test.ts`    |
| Correct `rsvpCount` increment on RSVP write | Integration: Server Action tests against emulator     |
| Idempotent re-RSVP behaviour                | Integration: Server Action tests                      |
| Email dispatch on RSVP                      | Unit: mock email provider + stub                      |
| Full RSVP → cancel user flow                | E2E: Playwright                                       |

The rules test suite answers: **"does Firestore grant the right people access to the right documents?"**  
It does not and cannot answer: **"does our application behave correctly within those access grants?"**

---
