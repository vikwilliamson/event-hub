# EventHub — Firebase Security Rules
**Version:** 1.0 · **Depends on:** Data Model v1.0 · **Status:** Draft

---

## 1. The Rules

```js
// firestore.rules

rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ─────────────────────────────────────────────────────────────
    // HELPER FUNCTIONS
    // Defined once, reused across rules. Firestore rules do not
    // support imports — functions are the only reuse mechanism.
    // ─────────────────────────────────────────────────────────────

    // Is the caller signed in at all?
    function isAuthenticated() {
      return request.auth != null;
    }

    // Is the caller the owner of this path segment?
    function isOwner(uid) {
      return isAuthenticated() && request.auth.uid == uid;
    }

    // Does the incoming document contain ONLY the listed keys?
    // Prevents a client from injecting extra fields (e.g., role escalation).
    function hasOnly(keys) {
      return request.resource.data.keys().hasOnly(keys);
    }

    // Does the incoming document contain AT LEAST the listed keys?
    function hasAll(keys) {
      return request.resource.data.keys().hasAll(keys);
    }

    // Is the field value one of the allowed enum members?
    function isValidStatus(field, allowed) {
      return request.resource.data[field] in allowed;
    }

    // Is the incoming value for a field identical to the stored value?
    // Used to prevent mutation of immutable fields on updates.
    function isUnchanged(field) {
      return request.resource.data[field] == resource.data[field];
    }

    // Is the event document in a publicly readable state?
    function isPublishedEvent(eventData) {
      return eventData.status == 'published';
    }

    // ─────────────────────────────────────────────────────────────
    // /users/{userId}
    //
    // Auth mirror documents. Created by a Cloud Function on
    // auth.user().onCreate(). Clients may read/update their own
    // document but may not create or delete (lifecycle is managed
    // server-side).
    // ─────────────────────────────────────────────────────────────

    match /users/{userId} {

      // A user may read only their own document.
      allow read: if isOwner(userId);

      // A user may update only their own document, and only the
      // mutable fields. They cannot touch uid, email (which mirrors
      // Auth), or createdAt.
      allow update: if isOwner(userId)
                    && hasOnly(['updatedAt'])
                    && isUnchanged('uid')
                    && isUnchanged('email')
                    && isUnchanged('createdAt');

      // Create and delete are server-only (Cloud Function / Admin SDK).
      allow create, delete: if false;
    }

    // ─────────────────────────────────────────────────────────────
    // /organizers/{userId}
    //
    // Organizer profile documents. An organizer reads and updates
    // their own profile. No public read — organizer display name
    // is denormalized onto event documents for public consumption.
    // ─────────────────────────────────────────────────────────────

    match /organizers/{userId} {

      // Only the organizer reads their own profile.
      allow read: if isOwner(userId);

      // Organizer may update display name and updatedAt only.
      // uid, email, eventCount, and createdAt are immutable from
      // the client. eventCount is managed by Server Actions via
      // Admin SDK (FieldValue.increment) — not directly editable.
      allow update: if isOwner(userId)
                    && hasOnly(['displayName', 'updatedAt'])
                    && isUnchanged('uid')
                    && isUnchanged('email')
                    && isUnchanged('eventCount')
                    && isUnchanged('createdAt');

      // Create and delete are server-only.
      allow create, delete: if false;

      // ───────────────────────────────────────────────────────────
      // /organizers/{userId}/events/{eventId}
      //
      // Event documents. Public read when published. All writes are
      // scoped to the owning organizer and validated for field shape.
      // ───────────────────────────────────────────────────────────

      match /events/{eventId} {

        // PUBLIC READ: Any visitor may read a published event.
        // Organizers may always read their own events regardless of status.
        allow read: if isPublishedEvent(resource.data)
                    || isOwner(userId);

        // CREATE: Authenticated organizer only, with strict field validation.
        allow create: if isOwner(userId)
                      && isValidCreate();

        // UPDATE: Authenticated organizer only, with immutability guards.
        allow update: if isOwner(userId)
                      && isValidUpdate();

        // DELETE: Explicitly prohibited. Cancellation sets status = 'cancelled';
        // hard deletes are Admin SDK only (for GDPR erasure etc.).
        allow delete: if false;

        // ─────────────────────────────────────────────────────────
        // /organizers/{userId}/events/{eventId}/rsvps/{rsvpId}
        //
        // RSVP documents. ALL client writes are forbidden.
        // RSVPs are created, updated, and read exclusively via
        // Server Actions using the Firebase Admin SDK.
        //
        // The organizer may read RSVPs for their own events only.
        // Attendees have no read access — they have no account.
        // ─────────────────────────────────────────────────────────

        match /rsvps/{rsvpId} {

          // Organizer may read RSVPs for their own events.
          allow read: if isOwner(userId);

          // ALL writes are server-only (Admin SDK bypasses rules).
          // This is belt-and-suspenders: even if a client somehow
          // obtained a valid credential, it cannot write RSVPs.
          allow write: if false;
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// HELPER FUNCTION BODIES (defined inside the service block above;
// shown here separately for clarity in this document)
// ─────────────────────────────────────────────────────────────────

// isValidCreate() — validates a new event document shape
//
// function isValidCreate() {
//   let d = request.resource.data;
//   return hasAll(['id', 'organizerId', 'organizerName', 'title',
//                  'description', 'location', 'startsAt', 'capacity',
//                  'rsvpCount', 'status', 'visibility', 'createdAt',
//                  'updatedAt', 'cancelledAt', 'publishedAt', 'endsAt'])
//       // organizerId must match the caller — prevents one organizer
//       // creating events that appear owned by another
//       && d.organizerId == request.auth.uid
//       // id must match the document path — prevents mismatched IDs
//       && d.id == eventId
//       // status must start as draft or published — never cancelled
//       && d.status in ['draft', 'published']
//       // rsvpCount must be 0 on create — cannot pre-seed attendance
//       && d.rsvpCount == 0
//       // visibility is always 'public' in v1
//       && d.visibility == 'public'
//       // cancelledAt and publishedAt are null on create
//       && d.cancelledAt == null
//       // title must be a non-empty string
//       && d.title is string && d.title.size() > 0 && d.title.size() <= 100
//       // description must be a non-empty string
//       && d.description is string && d.description.size() > 0
//       // location must be a non-empty string
//       && d.location is string && d.location.size() > 0
//       // startsAt must be in the future
//       && d.startsAt > request.time;
// }

// isValidUpdate() — validates an event document update
//
// function isValidUpdate() {
//   let d = request.resource.data;
//   return // Immutable identity fields cannot change
//          isUnchanged('id')
//       && isUnchanged('organizerId')
//       && isUnchanged('createdAt')
//       // rsvpCount is managed by Server Actions only
//       && isUnchanged('rsvpCount')
//       // status transitions are constrained:
//       // draft → published ✓
//       // published → draft ✓
//       // published → cancelled ✓
//       // cancelled → anything ✗ (terminal state)
//       && (resource.data.status != 'cancelled')
//       && (d.status in ['draft', 'published', 'cancelled'])
//       // If transitioning to cancelled, cancelledAt must be set
//       && (d.status != 'cancelled' || d.cancelledAt != null)
//       // If transitioning to published, publishedAt must be set
//       && (d.status != 'published' || d.publishedAt != null);
// }
```

### Production-Ready Combined File

The rules above with helper functions inlined as Firestore requires:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return isAuthenticated() && request.auth.uid == uid;
    }

    function isUnchanged(field) {
      return request.resource.data[field] == resource.data[field];
    }

    function isPublishedEvent(eventData) {
      return eventData.status == 'published';
    }

    function isValidEventCreate(userId, eventId) {
      let d = request.resource.data;
      return d.organizerId == userId
          && d.id == eventId
          && d.status in ['draft', 'published']
          && d.rsvpCount == 0
          && d.visibility == 'public'
          && d.cancelledAt == null
          && d.title is string
          && d.title.size() >= 3
          && d.title.size() <= 100
          && d.description is string
          && d.description.size() >= 10
          && d.location is string
          && d.location.size() >= 3
          && d.startsAt is timestamp
          && d.startsAt > request.time
          && d.createdAt == request.time
          && d.updatedAt == request.time;
    }

    function isValidEventUpdate() {
      let d = request.resource.data;
      let prev = resource.data;
      return isUnchanged('id')
          && isUnchanged('organizerId')
          && isUnchanged('createdAt')
          && isUnchanged('rsvpCount')
          && prev.status != 'cancelled'
          && d.status in ['draft', 'published', 'cancelled']
          && (d.status != 'cancelled' || d.cancelledAt != null)
          && (d.status != 'published' || d.publishedAt != null)
          && d.title is string
          && d.title.size() >= 3
          && d.title.size() <= 100;
    }

    match /users/{userId} {
      allow read: if isOwner(userId);
      allow update: if isOwner(userId)
                    && isUnchanged('uid')
                    && isUnchanged('email')
                    && isUnchanged('createdAt');
      allow create, delete: if false;
    }

    match /organizers/{userId} {
      allow read: if isOwner(userId);
      allow update: if isOwner(userId)
                    && isUnchanged('uid')
                    && isUnchanged('email')
                    && isUnchanged('eventCount')
                    && isUnchanged('createdAt');
      allow create, delete: if false;

      match /events/{eventId} {
        allow read: if isPublishedEvent(resource.data)
                    || isOwner(userId);
        allow create: if isOwner(userId)
                      && isValidEventCreate(userId, eventId);
        allow update: if isOwner(userId)
                      && isValidEventUpdate();
        allow delete: if false;

        match /rsvps/{rsvpId} {
          allow read: if isOwner(userId);
          allow write: if false;
        }
      }
    }
  }
}
```

---

## 2. Rule-by-Rule Explanation

### `isOwner(uid)`
Checks two things in one call: the request carries a valid Firebase Auth token (`request.auth != null`) **and** the UID in that token matches the path segment being accessed. This is the primary ownership gate throughout the ruleset. Splitting the auth check from the ownership check into one helper prevents accidentally writing `request.auth.uid == uid` without the null guard — a common bug that causes a rules evaluation error rather than a denial.

### `/users/{userId}` — read and update only, no create/delete
The `users` document lifecycle is owned by the server (Cloud Function on Auth user creation). Clients can read and update their own document but cannot create one (they cannot bootstrap their own profile outside the Auth trigger) or delete one (deletion requires server-side cleanup of all dependent data). The `allow update` rule explicitly locks `uid`, `email`, and `createdAt` — even if the client sends a crafted write with those fields modified, the rule rejects it.

### `/organizers/{userId}` — update guards on `eventCount`
`eventCount` is a denormalized counter managed exclusively by Server Actions. If a client could update it, they could claim to have hosted 10,000 events or reset it to zero. `isUnchanged('eventCount')` makes this field effectively read-only from the client — the only way to change it is via the Admin SDK.

### `/organizers/{userId}/events/{eventId}` — create validation
`isValidEventCreate()` enforces five meaningful constraints beyond "is authenticated":

1. `d.organizerId == userId` — the `organizerId` field must match the path. Without this, an authenticated organizer could write `{ organizerId: "someOtherUid" }` and create an event that appears to belong to another organizer.

2. `d.id == eventId` — the `id` field must match the document ID. Without this, a client could create a document where the embedded `id` field disagrees with the Firestore path — causing silent bugs in any query that uses the field vs the path.

3. `d.rsvpCount == 0` — RSVP counts are computed server-side in the transaction. A client cannot pre-seed a fake attendance number.

4. `d.status in ['draft', 'published']` — a newly created event cannot start in the `cancelled` state.

5. `d.startsAt > request.time` — events must be in the future at creation time. `request.time` is the Firestore server timestamp — it cannot be spoofed by the client.

### `/organizers/{userId}/events/{eventId}` — update immutability guards
`isValidEventUpdate()` prevents:
- Changing `id` or `organizerId` (would reassign event ownership)
- Changing `createdAt` (would falsify the event's history)
- Directly mutating `rsvpCount` (managed only by the transaction)
- Transitioning out of `cancelled` (cancelled is a terminal state in v1)
- Setting `cancelledAt = null` when transitioning to cancelled (data integrity)

### `/rsvps/{rsvpId}` — `allow write: if false`
This is the most important single rule in the file. Because all RSVP operations use the Admin SDK server-side, the client SDK should **never** need to write to this collection. Setting `allow write: if false` means even a fully authenticated organizer cannot write RSVP documents through the client SDK. This makes attendee PII (email addresses) impossible to create, modify, or delete from the browser — regardless of what the client-side code does. The Admin SDK bypasses these rules and is the exclusive write path.

---

## 3. Abuse Cases Prevented

| # | Attack | How the rules prevent it |
|---|--------|--------------------------|
| **A-01** | **Unauthenticated event creation** | `isOwner(userId)` on all event writes requires a valid Firebase Auth session. No token → denied at the first check. |
| **A-02** | **Organizer creates event under another organizer's path** | `d.organizerId == userId` in `isValidEventCreate()` enforces that the `organizerId` field must match the authenticated UID. Writing to `/organizers/victim-uid/events/` with your own auth token is denied because your UID ≠ `victim-uid`. |
| **A-03** | **Client sets a fake `rsvpCount` on create** | `d.rsvpCount == 0` in `isValidEventCreate()`. A crafted create with `rsvpCount: 500` is rejected. |
| **A-04** | **Client increments `rsvpCount` directly on update** | `isUnchanged('rsvpCount')` in `isValidEventUpdate()`. Any update that modifies this field is rejected regardless of authentication. |
| **A-05** | **Client creates a cancelled event** | `d.status in ['draft', 'published']` on create. `cancelled` is not an allowed initial state. |
| **A-06** | **Client resurrects a cancelled event** | `prev.status != 'cancelled'` in `isValidEventUpdate()`. Once cancelled, no update is permitted — the document is frozen from the client's perspective. |
| **A-07** | **Client reads another organizer's draft events** | Read access on events requires either `isPublishedEvent()` (public) or `isOwner(userId)` (owner). A published event is publicly readable; a draft is not. An organizer at path `/organizers/uid-a/events/` cannot read another organizer's path `/organizers/uid-b/events/`. |
| **A-08** | **Client reads RSVP list (attendee PII)** | `allow read: if isOwner(userId)` on `/rsvps/`. Only the event's owning organizer can read RSVPs. No unauthenticated read, no cross-organizer read. |
| **A-09** | **Client writes RSVPs directly (bypassing capacity check)** | `allow write: if false` on `/rsvps/`. Unconditional denial. Client cannot create, update, or delete any RSVP document regardless of auth state. |
| **A-10** | **Attendee reads another attendee's RSVP or email** | Same as A-08 — attendees have no auth in v1. Even if they did, they are not the owning organizer. |
| **A-11** | **Client sets mismatched `id` field on event** | `d.id == eventId` in `isValidEventCreate()`. The embedded ID must equal the Firestore document ID — prevents documents where `doc.id != doc.data().id`. |
| **A-12** | **Client sets a past `startsAt` date** | `d.startsAt > request.time` — Firestore evaluates `request.time` server-side. The client cannot spoof it by sending a server timestamp from the future in the request. |
| **A-13** | **Client elevates `eventCount` on organizer profile** | `isUnchanged('eventCount')` on the organizer update rule. A client cannot self-report inflated event history. |
| **A-14** | **Client deletes events or user documents** | `allow delete: if false` on events; `allow create, delete: if false` on users. Hard deletes require the Admin SDK — they cannot be triggered client-side. |
| **A-15** | **Client changes their own `uid` or `email` on the user document** | `isUnchanged('uid')` and `isUnchanged('email')` on the user update rule. These fields mirror Firebase Auth and cannot be diverged from the client. |
| **A-16** | **Organizer reads another organizer's profile** | `/organizers/{userId}` requires `isOwner(userId)`. There is no public read on organizer profiles — display names are read from the denormalized field on event documents. |
| **A-17** | **Authenticated non-owner reads draft events via direct URL** | The event read rule is: `isPublishedEvent() || isOwner()`. An authenticated user who is not the event owner cannot read a draft. Being logged in is not sufficient. |

---

## 4. What the Rules Do Not Protect (and Why)

Knowing the boundaries of the rules is as important as knowing what they enforce.

| Gap | Reason | Mitigation |
|-----|--------|------------|
| **RSVP create path is entirely server-side** | `allow write: if false` on RSVPs means Firestore rules cannot validate the RSVP write — the Admin SDK bypasses them. All RSVP validation (capacity, idempotency, cancel token) must be correct in the Server Action. | Server Action is the sole code path; Zod validates input; transaction enforces capacity; integration tests cover the logic. |
| **Cancel token HMAC validation** | Rules cannot perform cryptographic verification. A rule cannot check if a cancel token is a valid HMAC-signed value. | Token validation lives in the Server Action (`lib/tokens/cancel-token.ts`). The `cancelToken` field is never queryable by the client (RSVP collection is client-unreadable). |
| **Rate limiting** | Firestore Security Rules have no concept of rate limiting. A single client could submit thousands of RSVP attempts. | Add App Check (Firebase's device attestation) in v2. In v1, rely on the Firestore transaction overhead as a natural throttle and add server-side rate limiting on the Server Action using Upstash or similar. |
| **Email enumeration on RSVP** | Rules cannot hide whether an RSVP document exists for a given email — but since clients cannot query RSVPs at all (`allow read: if isOwner()`), this is moot. | The Admin SDK path in the Server Action deliberately returns the same "already registered" response regardless of prior state, to avoid leaking presence. |

---

## 5. Testing the Rules

Rules should be tested with the Firebase Emulator and `@firebase/rules-unit-testing`. A sample test structure:

```ts
// tests/integration/firestore.rules.test.ts

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'eventhub-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});

afterEach(async () => env.clearFirestore());
afterAll(async () => env.cleanup());

describe('Event reads', () => {
  it('allows public read of published events', async () => {
    const organizer = env.authenticatedContext('org-1');
    const unauthenticated = env.unauthenticatedContext();

    // Organizer creates a published event
    await organizer.firestore()
      .doc('organizers/org-1/events/evt-1')
      .set({ status: 'published', organizerId: 'org-1', id: 'evt-1', rsvpCount: 0,
             visibility: 'public', title: 'Test', description: 'Test event',
             location: 'Here', startsAt: new Date(Date.now() + 86400000),
             createdAt: new Date(), updatedAt: new Date(),
             cancelledAt: null, publishedAt: new Date(), endsAt: null,
             organizerName: 'Org One' });

    // Unauthenticated user can read it
    await assertSucceeds(
      unauthenticated.firestore()
        .doc('organizers/org-1/events/evt-1')
        .get()
    );
  });

  it('denies public read of draft events', async () => {
    const organizer = env.authenticatedContext('org-1');
    const visitor = env.authenticatedContext('other-user');

    await organizer.firestore()
      .doc('organizers/org-1/events/evt-draft')
      .set({ status: 'draft', organizerId: 'org-1', id: 'evt-draft', rsvpCount: 0,
             visibility: 'public', title: 'Draft', description: 'Not yet live',
             location: 'TBD', startsAt: new Date(Date.now() + 86400000),
             createdAt: new Date(), updatedAt: new Date(),
             cancelledAt: null, publishedAt: null, endsAt: null,
             organizerName: 'Org One' });

    // Another authenticated user cannot read a draft
    await assertFails(
      visitor.firestore()
        .doc('organizers/org-1/events/evt-draft')
        .get()
    );
  });
});

describe('RSVP writes', () => {
  it('denies all client writes to RSVPs', async () => {
    const organizer = env.authenticatedContext('org-1');

    // Even the event organizer cannot write RSVPs via client SDK
    await assertFails(
      organizer.firestore()
        .doc('organizers/org-1/events/evt-1/rsvps/rsvp-1')
        .set({ attendeeEmail: 'test@example.com', status: 'confirmed' })
    );
  });
});

describe('Privilege escalation', () => {
  it('denies creating an event with a mismatched organizerId', async () => {
    const attacker = env.authenticatedContext('attacker-uid');

    await assertFails(
      attacker.firestore()
        .doc('organizers/victim-uid/events/evt-1')
        .set({
          organizerId: 'attacker-uid', // attacker's real UID
          id: 'evt-1',
          status: 'draft',
          rsvpCount: 0,
          visibility: 'public',
          title: 'Hijacked',
          description: 'Under victim path',
          location: 'Somewhere',
          startsAt: new Date(Date.now() + 86400000),
          createdAt: new Date(),
          updatedAt: new Date(),
          cancelledAt: null,
          publishedAt: null,
          endsAt: null,
          organizerName: 'Attacker',
        })
    );
  });

  it('denies directly setting rsvpCount on update', async () => {
    const organizer = env.authenticatedContext('org-1');

    await assertFails(
      organizer.firestore()
        .doc('organizers/org-1/events/evt-1')
        .update({ rsvpCount: 9999, updatedAt: new Date() })
    );
  });
});
```

---