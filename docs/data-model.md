# EventHub — Firestore Data Model

**Version:** 1.0 · **Depends on:** PRD v1.1, ADR-003 · **Status:** Draft

---

## 1. Design Principles

Before the schema, the rules that shaped it:

**1. Model for your query patterns, not your domain diagram.**
Firestore is not a relational database. The shape of documents follows what the app needs to read, not what looks tidy on a whiteboard. Every collection exists because there is a query that requires it.

**2. Ownership is structural, not just a field.**
An organizer's events live under their organizer document. An event's RSVPs live under the event. Hierarchy enforces ownership at the Security Rules layer — no `WHERE createdBy = uid` queries needed to scope access.

**3. Duplicate read-optimized data deliberately, document it, and keep it synchronized.**
Firestore requires denormalization. We do it intentionally and track every duplicated field in §6 so we know what to update when a source changes.

**4. Keep the v1 model simple enough to reason about completely.**
No polymorphic documents, no deeply nested arrays of objects, no collection group queries that span the entire database. Every query in §5 can be explained in one sentence.

---

## 2. Collection Structure

```
/users/{userId}
/organizers/{userId}                   ← same ID as /users/{userId}
/organizers/{userId}/events/{eventId}
/organizers/{userId}/events/{eventId}/rsvps/{rsvpId}
```

That is the entire database. Four collection levels, no flat cross-cutting collections, no join documents.

**Why organizers is a separate top-level collection from users?**
In v1, every authenticated user _is_ an organizer — there is no attendee account. But the data they store is different: a `user` document holds auth profile data, an `organizer` document holds business-facing fields (display name, event count). Keeping them separate means we can add non-organizer accounts in v2 (e.g., attendees who register) without migrating the organizer schema. The documents share the same `userId` as their document ID, making the join trivial and free.

---

## 3. Document Shapes

### 3.1 `/users/{userId}`

Created by a Cloud Function triggered on `auth.user().onCreate()` — not by the client directly.

```ts
// src/types/user.types.ts

interface UserDoc {
  uid: string; // mirrors the document ID and Firebase Auth UID
  email: string; // sourced from Firebase Auth on creation
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Why bother with a users collection at all?**
Firebase Auth stores email and UID, but you cannot query Auth from a client. If we ever need to look up a user by email (e.g., to send an invite), we need a Firestore record. In v1 this collection is minimal — it's a hook for v2 features, not a load-bearing structure. Its Security Rules allow a user to read and write only their own document.

---

### 3.2 `/organizers/{userId}`

```ts
// src/types/organizer.types.ts

interface OrganizerDoc {
  uid: string; // document ID = Firebase Auth UID
  displayName: string; // shown on public event pages
  email: string; // duplicated from users/{uid} for display
  eventCount: number; // denormalized counter; incremented on event create
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**`eventCount` is denormalized.** It exists to show "12 events hosted" on a future organizer profile without an aggregation query. It is incremented atomically (via `FieldValue.increment(1)`) in the same Server Action that creates an event. See §6 for the full denormalization register.

**`displayName`** is separate from Firebase Auth's `displayName`. Organizers should be able to set a public-facing name that differs from their account name, without touching their Auth profile.

---

### 3.3 `/organizers/{userId}/events/{eventId}`

The primary content document. Readable publicly (via Security Rules) when `status === 'published'`.

```ts
// src/types/event.types.ts

type EventStatus = "draft" | "published" | "cancelled";
type EventVisibility = "public"; // v1 only; 'private' is a v2 concept

interface EventDoc {
  // Identity
  id: string; // mirrors document ID; makes client code cleaner
  organizerId: string; // mirrors parent collection segment

  // Content
  title: string;
  description: string; // plain text; no markdown in v1
  location: string; // free text: address, venue name, or "Online"

  // Scheduling
  startsAt: Timestamp; // authoritative date + time, stored as UTC
  endsAt: Timestamp | null; // optional; not shown in v1 UI but stored for v2

  // Capacity
  capacity: number | null; // null = unlimited
  rsvpCount: number; // denormalized; updated in RSVP transaction

  // Status
  status: EventStatus;
  visibility: EventVisibility; // always 'public' in v1; field exists for v2

  // Organizer display (denormalized for public event page read)
  organizerName: string; // duplicated from organizers/{uid}.displayName

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  cancelledAt: Timestamp | null;
  publishedAt: Timestamp | null;
}
```

**`startsAt` as a single `Timestamp`, not separate date + time fields.**
The form collects date and time as separate inputs (native `<input type="date">` + `<input type="time">`). The Server Action combines them into a single UTC `Timestamp` before writing. This is strictly better for querying (range queries on a single field), sorting, and timezone handling. The client reconstructs date and time strings for display using `Intl.DateTimeFormat`.

**`organizerName` is duplicated on the event document.**
The public event page must render the organizer's display name. Without this duplication, reading an event page would require two document reads: the event + the organizer. With it, one read is sufficient. When the organizer updates their `displayName`, a Cloud Function propagates the change to their published events. See §6.

**`status` is an enum, not a boolean `isPublished`.**
A boolean cannot represent the three states: draft, published, cancelled. Enums also extend cleanly — if we add 'postponed' in v2, no schema migration is needed for existing documents; they simply don't have that value.

---

### 3.4 `/organizers/{userId}/events/{eventId}/rsvps/{rsvpId}`

```ts
// src/types/rsvp.types.ts

type RsvpStatus = "confirmed" | "cancelled";

interface RsvpDoc {
  // Identity
  id: string; // deterministic: hash of (eventId + normalizedEmail)
  eventId: string; // redundant with path but useful in Cloud Functions
  organizerId: string; // redundant with path; enables organizer-scoped queries

  // Attendee
  attendeeName: string;
  attendeeEmail: string; // stored in plaintext; only readable by the event organizer

  // Cancel token
  cancelToken: string; // HMAC-signed token; used to authorize cancellation
  cancelTokenExpiresAt: Timestamp;

  // Status
  status: RsvpStatus;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  cancelledAt: Timestamp | null;
}
```

**Deterministic document ID for idempotency.**
`rsvpId = sha256(eventId + ":" + normalizedEmail)` where `normalizedEmail = email.toLowerCase().trim()`.

This means if the same email submits the RSVP form twice:

- The `tx.set(rsvpRef, data)` call overwrites the existing document (same ID)
- `rsvpCount` on the event is **not** incremented again (the transaction checks `status` of the existing doc first)
- The user receives a new confirmation email with a fresh cancel token

No unique index, no prior read — the document ID itself enforces uniqueness.

**`cancelToken` lives on the RSVP document, not in a separate collection.**
The cancel flow: attendee clicks link → Server Action receives `eventId` + `token` → queries RSVP by `cancelToken` field → verifies HMAC + expiry → sets `status = 'cancelled'`.

Alternative considered: a separate `/cancelTokens/{token}` collection. Rejected because it adds a collection for a single field, and querying by a field on the rsvp document (with an index) is sufficient and keeps all RSVP state co-located.

**`attendeeEmail` privacy.**
Attendee email is sensitive PII. Security Rules ensure only the event organizer can read RSVP documents. Attendees cannot read each other's data — they cannot even read their own RSVP document (they have no account). The cancel flow authenticates via token, not session, so no RSVP read is exposed to an unauthenticated client.

---

## 4. TypeScript Interfaces — Complete

```ts
// src/lib/firebase/converters.ts
//
// Firestore data converters provide type safety between raw Firestore documents
// and our typed interfaces. The converter is attached to a collection reference;
// all reads and writes through that reference are automatically typed.

import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  Timestamp,
} from "firebase-admin/firestore";

// ─── Domain types (what the app works with) ───────────────────────────────

export interface Event {
  id: string;
  organizerId: string;
  organizerName: string;
  title: string;
  description: string;
  location: string;
  startsAt: Date; // converted from Timestamp on read
  endsAt: Date | null;
  capacity: number | null;
  rsvpCount: number;
  status: "draft" | "published" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  publishedAt: Date | null;
}

export interface Rsvp {
  id: string;
  eventId: string;
  organizerId: string;
  attendeeName: string;
  attendeeEmail: string;
  cancelToken: string;
  cancelTokenExpiresAt: Date;
  status: "confirmed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
}

// ─── Firestore document types (raw storage shape) ─────────────────────────

interface EventDoc extends Omit<
  Event,
  | "startsAt"
  | "endsAt"
  | "createdAt"
  | "updatedAt"
  | "cancelledAt"
  | "publishedAt"
> {
  startsAt: Timestamp;
  endsAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  cancelledAt: Timestamp | null;
  publishedAt: Timestamp | null;
}

// ─── Converters ───────────────────────────────────────────────────────────

export const eventConverter: FirestoreDataConverter<Event> = {
  toFirestore(event: Event): EventDoc {
    return {
      ...event,
      startsAt: Timestamp.fromDate(event.startsAt),
      endsAt: event.endsAt ? Timestamp.fromDate(event.endsAt) : null,
      createdAt: Timestamp.fromDate(event.createdAt),
      updatedAt: Timestamp.fromDate(event.updatedAt),
      cancelledAt: event.cancelledAt
        ? Timestamp.fromDate(event.cancelledAt)
        : null,
      publishedAt: event.publishedAt
        ? Timestamp.fromDate(event.publishedAt)
        : null,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Event {
    const d = snapshot.data() as EventDoc;
    return {
      ...d,
      id: snapshot.id,
      startsAt: d.startsAt.toDate(),
      endsAt: d.endsAt?.toDate() ?? null,
      createdAt: d.createdAt.toDate(),
      updatedAt: d.updatedAt.toDate(),
      cancelledAt: d.cancelledAt?.toDate() ?? null,
      publishedAt: d.publishedAt?.toDate() ?? null,
    };
  },
};
```

**Why converters matter:** Without them, every `snapshot.data()` call returns `DocumentData` — an untyped `Record<string, any>`. Converters push type safety to the collection reference level; every downstream consumer gets a typed object with `Date` instances instead of raw `Timestamp` objects. Attaching the converter once means it cannot be forgotten.

---

## 5. Query Patterns

Every query the MVP requires, with the collection path, filters, ordering, and whether an index is needed.

### Q1 — Public event detail page

**Read a single published event (any visitor).**

```ts
const eventRef = db
  .collection("organizers")
  .doc(organizerId)
  .collection("events")
  .doc(eventId)
  .withConverter(eventConverter);

const snap = await eventRef.get();
if (!snap.exists || snap.data()!.status !== "published") {
  return null; // triggers notFound()
}
```

**Index required:** None — single document read.
**Notes:** The `status` check is in application code, not the query, because Firestore doesn't support `WHERE` on single-document reads. Security Rules enforce that only published events are readable by unauthenticated users (belt-and-suspenders — the app check is still needed to return a 404 cleanly rather than a permission error).

---

### Q2 — Organizer's event list (dashboard)

**All events belonging to the authenticated organizer, newest first.**

```ts
const eventsRef = db
  .collection("organizers")
  .doc(organizerId)
  .collection("events")
  .orderBy("createdAt", "desc")
  .withConverter(eventConverter);

const snap = await eventsRef.get();
```

**Index required:** None — single-field `orderBy` on a subcollection uses the automatic single-field index.
**Notes:** Returns all events regardless of status. The organizer sees drafts, published, and cancelled. Client-side filtering by status (if added) is acceptable at this scale — an organizer is unlikely to have more than a few hundred events.

---

### Q3 — RSVP write with capacity check (transaction)

**Atomically check capacity and write RSVP.**

```ts
await db.runTransaction(async (tx) => {
  const eventRef = db
    .collection("organizers")
    .doc(organizerId)
    .collection("events")
    .doc(eventId)
    .withConverter(eventConverter);

  const rsvpRef = db
    .collection("organizers")
    .doc(organizerId)
    .collection("events")
    .doc(eventId)
    .collection("rsvps")
    .doc(rsvpId); // deterministic ID

  const eventSnap = await tx.get(eventRef);
  const event = eventSnap.data();

  if (!event || event.status !== "published") {
    throw new AppError("Event not available", "EVENT_UNAVAILABLE", 404);
  }

  if (event.capacity !== null && event.rsvpCount >= event.capacity) {
    throw new AppError("Event is at capacity", "CAPACITY_EXCEEDED", 409);
  }

  // Check if this email already has an RSVP (read within transaction)
  const existingSnap = await tx.get(rsvpRef);
  if (existingSnap.exists && existingSnap.data()!.status === "confirmed") {
    throw new AppError("Already registered", "ALREADY_REGISTERED", 409);
  }

  const isNew =
    !existingSnap.exists || existingSnap.data()!.status === "cancelled";

  tx.set(rsvpRef, rsvpData);

  if (isNew) {
    tx.update(eventRef, {
      rsvpCount: FieldValue.increment(1),
      updatedAt: Timestamp.now(),
    });
  }
});
```

**Index required:** None — reads by document ID within a transaction.

---

### Q4 — RSVP list for organizer (attendee view)

**All confirmed RSVPs for a specific event, ordered by creation time.**

```ts
const rsvpsRef = db
  .collection("organizers")
  .doc(organizerId)
  .collection("events")
  .doc(eventId)
  .collection("rsvps")
  .where("status", "==", "confirmed")
  .orderBy("createdAt", "asc");

const snap = await rsvpsRef.get();
```

**Index required:** Composite index on `rsvps`: `(status ASC, createdAt ASC)`.
Firestore requires a composite index for any query combining `where` + `orderBy` on different fields.

---

### Q5 — Cancel RSVP by token

**Find an RSVP document by its cancel token (no auth — token is the credential).**

```ts
// Note: this is a collection group query across all rsvps subcollections
// scoped to a known event path to limit scan surface
const rsvpsRef = db
  .collection("organizers")
  .doc(organizerId)
  .collection("events")
  .doc(eventId)
  .collection("rsvps")
  .where("cancelToken", "==", incomingToken)
  .where("status", "==", "confirmed")
  .limit(1);

const snap = await rsvpsRef.get();
```

**Index required:** Composite index on `rsvps`: `(cancelToken ASC, status ASC)`.
**Security note:** The token is an HMAC-signed value. Firestore Security Rules cannot verify HMAC — this query runs server-side only (Admin SDK in a Server Action). The token is never queried client-side. Brute-forcing is infeasible: tokens are 32 bytes of cryptographic randomness.

---

### Q6 — "My Events" — future published events (v2 attendee feature placeholder)

**Not in v1 — attendees have no accounts. Documented here to confirm the schema supports it.**

If attendee accounts are added in v2:

```ts
// Would require a top-level /rsvps collection or a collection group index
// Current subcollection model supports this via collection group query:
const myRsvps = db
  .collectionGroup("rsvps")
  .where("attendeeEmail", "==", currentUserEmail)
  .where("status", "==", "confirmed")
  .orderBy("createdAt", "desc");
```

**Collection group index required:** `(attendeeEmail ASC, status ASC, createdAt DESC)`.
This index does not need to be created in v1 — it's documented here to confirm the schema doesn't prevent this query. The subcollection model supports collection group queries natively.

---

## 6. Index Manifest (`firestore.indexes.json`)

```json
{
  "indexes": [
    {
      "collectionGroup": "rsvps",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "rsvps",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "cancelToken", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

**Only two composite indexes for the entire v1 data model.** Both are on the `rsvps` subcollection. The events collection requires no composite indexes in v1 because the organizer dashboard query uses a single `orderBy` field (covered by Firestore's automatic single-field indexes).

---

## 7. Denormalization Register

Every field duplicated across documents, with its source of truth and sync mechanism.

| Duplicated field | Lives on           | Source of truth                 | Sync mechanism                                                | Drift risk                                                                                         |
| ---------------- | ------------------ | ------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `organizerName`  | `events/{id}`      | `organizers/{uid}.displayName`  | Cloud Function on organizer update                            | Low — organizers rarely rename                                                                     |
| `organizerId`    | `rsvps/{id}`       | Path segment `organizers/{uid}` | Set on write by Server Action                                 | None — immutable after creation                                                                    |
| `eventId`        | `rsvps/{id}`       | Path segment `events/{id}`      | Set on write by Server Action                                 | None — immutable after creation                                                                    |
| `rsvpCount`      | `events/{id}`      | `rsvps` subcollection count     | Incremented/decremented in RSVP transaction                   | Low — transaction atomicity prevents most drift; reconciliation function handles edge cases        |
| `email`          | `organizers/{uid}` | `users/{uid}.email`             | Set on organizer profile creation; not synced on email change | Medium — Firebase Auth email can change; v1 treats organizer email as immutable after registration |

**Reconciliation plan for `rsvpCount` drift:**
In the event of a partial write (network failure between the `rsvp.set()` and `event.update()` in a transaction — theoretically impossible in a single transaction but included for completeness), the count can be reconciled by a Cloud Function that compares `event.rsvpCount` with `rsvps.where('status','==','confirmed').count()` and corrects the delta. This runs on a schedule (daily) or can be triggered manually.

---

## 8. Privacy & Ownership Model

```
Document                   Who can read?                    Who can write?
─────────────────────────────────────────────────────────────────────────────
users/{uid}                Owner only                       Owner only
organizers/{uid}           Owner (full), Public (display    Owner only
                           name only via event doc)
events/{uid}/events/{id}   Public if published,             Owner (organizer) only
                           Owner always
events/.../rsvps/{id}      Owner (organizer) only           Server-side only (Admin SDK)
                           Attendees: never (no account)    No client writes
```

**Key principle: RSVPs are never written or read by the client SDK.**
All RSVP operations (create, cancel, list) go through Server Actions that use the Firebase Admin SDK. This means:

- The client never holds a Firebase credential that can read attendee PII
- Security Rules on the `rsvps` subcollection can be `allow read, write: if false` as a backstop — the Admin SDK bypasses rules, and no legitimate client operation should touch this collection directly
- Attendee email addresses are never in the browser's network tab

**Organizer isolation:**
Because events are nested under `/organizers/{uid}/`, an organizer can only read their own events by construction — their UID is in the path. Security Rules confirm this:

```
match /organizers/{uid}/events/{eventId} {
  allow read: if resource.data.status == 'published'  // public read for published
           || request.auth.uid == uid;                // organizer reads all
  allow write: if request.auth.uid == uid;
}
```

No `WHERE organizerId = currentUser.uid` queries needed. The path _is_ the ownership check.

---

## 9. What This Model Deliberately Omits

| Omitted                     | Why                                                                                                                                                                               | How to add in v2                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Full-text search            | Firestore has no native full-text search. Implementing it requires Algolia/Typesense or a Cloud Function that syncs to a search index — not justified for v1's link-sharing model | Add Algolia sync on event publish Cloud Function                                                            |
| Tags / categories on events | Not in v1 scope                                                                                                                                                                   | Add `tags: string[]` field; add composite index on `(status, tags array-contains, startsAt)`                |
| Attendee accounts           | Attendees have no auth in v1                                                                                                                                                      | Add `/attendees/{uid}` collection; `rsvps` gains `attendeeId` field; collection group index on `attendeeId` |
| Event images                | No Storage in v1                                                                                                                                                                  | Add `coverImageUrl: string \| null` to `EventDoc`; Cloud Function generates thumbnail URL                   |
| Waitlist                    | Capacity closes RSVPs in v1                                                                                                                                                       | Add `waitlist` subcollection parallel to `rsvps`; promote on cancellation                                   |

---
