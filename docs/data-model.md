# EventHub — Firestore Data Model

**Version:** 1.1 · **Depends on:** PRD v1.2, ADR-003, ADR-006 · **Status:** Draft

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
In v1, both organizers and attendees have Firebase Auth accounts, but they operate differently: an organizer creates events and manages them via the dashboard; an attendee discovers events and RSVPs. The `organizer` document holds business-facing fields (display name, event count) that an attendee profile doesn't need. Keeping them separate means the `/organizers/{uid}` path remains an accurate structural constraint — organizer data lives there, and attendee RSVP history is queryable via the `rsvps` subcollection using `userId`. The documents share the same `userId` as their document ID, making the join trivial and free. Not every authenticated user has an `organizers/{uid}` document — only those who have gone through the organizer registration flow.

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

interface RsvpDoc {
  // Identity
  id: string;       // document ID = userId (ensures one RSVP per user per event)
  eventId: string;  // redundant with path but useful in Cloud Functions
  userId: string;   // Firebase Auth UID of the attendee
  organizerId: string; // redundant with path; enables organizer-scoped queries

  // Event snapshot (denormalized for My RSVPs display without extra reads)
  eventSnapshot: {
    title: string;
    startsAt: Timestamp;
    location: string;
  };

  // Timestamps
  createdAt: Timestamp;
  cancelledAt: Timestamp | null; // null = confirmed; non-null = cancelled
}
```

**Document ID = `userId` for structural idempotency.**
Because the document ID is the attendee's Firebase Auth UID, a second RSVP attempt by the same user writes to the same document path. The transaction checks whether the document already exists with `cancelledAt === null` — if so, it returns `ALREADY_REGISTERED`. No hash function needed, no prior read outside the transaction.

**No `status` field — `cancelledAt` is the source of truth.**
A document with `cancelledAt: null` is a confirmed RSVP. A document with a non-null `cancelledAt` is cancelled. This avoids a two-field consistency problem (both `status` and `cancelledAt` would need to be set atomically). Queries filter on `cancelledAt == null` instead of `status == "confirmed"`.

**`eventSnapshot` is denormalized for `/my-rsvps` display.**
The My RSVPs page lists all of an attendee's RSVPs with title, date, and location. Without the snapshot, every RSVP would require a separate event document read. With it, the entire My RSVPs list renders from a single collection-group query. The snapshot is set at RSVP creation time and is not updated if the organizer edits the event — this is acceptable in v1 (attendees are not notified of changes in v1 regardless).

**Attendee email and display name are not stored on the RSVP document.**
They are resolved on-demand from Firebase Auth Admin (`getAdminAuth().getUsers([{uid}])`) when the organizer loads the attendee list. This avoids duplicating PII into Firestore and keeps the authoritative name/email in Firebase Auth only. The organizer attendee list view does an extra Auth lookup; this is acceptable because the list is a low-frequency, admin-only read.

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
  id: string;         // = userId
  eventId: string;
  userId: string;
  organizerId: string;
  eventSnapshot: {
    title: string;
    startsAt: Date;   // converted from Timestamp on read
    location: string;
  };
  createdAt: Date;
  cancelledAt: Date | null; // null = confirmed; non-null = cancelled
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

  // Doc ID = userId — structural idempotency, no hash needed
  const rsvpRef = db
    .collection("organizers")
    .doc(organizerId)
    .collection("events")
    .doc(eventId)
    .collection("rsvps")
    .doc(userId);

  const eventSnap = await tx.get(eventRef);
  const event = eventSnap.data();

  if (!event || event.status !== "published") {
    throw new AppError("Event not available", "EVENT_UNAVAILABLE", 404);
  }

  if (event.capacity !== null && event.rsvpCount >= event.capacity) {
    throw new AppError("Event is at capacity", "CAPACITY_EXCEEDED", 409);
  }

  // Check if this user already has an active RSVP (read within transaction)
  const existingSnap = await tx.get(rsvpRef);
  if (existingSnap.exists && existingSnap.data()!.cancelledAt === null) {
    throw new AppError("Already registered", "ALREADY_REGISTERED", 409);
  }

  const isNew = !existingSnap.exists || existingSnap.data()!.cancelledAt !== null;

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
  .where("cancelledAt", "==", null)
  .orderBy("createdAt", "asc");

const snap = await rsvpsRef.get();
```

**Index required:** Composite index on `rsvps`: `(cancelledAt ASC, createdAt ASC)`.
Firestore requires a composite index for any query combining `where` + `orderBy` on different fields. Filtering `cancelledAt == null` is a standard Firestore equality filter and is indexed the same way as any other field.

---

### Q5 — Cancel RSVP (auth-based)

**Cancel an authenticated attendee's own RSVP by direct document reference.**

```ts
// The attendee's UID is both the session credential and the document ID —
// no query needed; the path is the credential.
const rsvpRef = db
  .collection("organizers")
  .doc(organizerId)
  .collection("events")
  .doc(eventId)
  .collection("rsvps")
  .doc(userId); // userId from verified session cookie

await db.runTransaction(async (tx) => {
  const rsvpSnap = await tx.get(rsvpRef);
  const eventSnap = await tx.get(eventRef);

  if (!rsvpSnap.exists || rsvpSnap.data()!.cancelledAt !== null) {
    throw new AppError("RSVP not found or already cancelled", "NOT_FOUND", 404);
  }

  tx.update(rsvpRef, { cancelledAt: Timestamp.now() });
  tx.update(eventRef, {
    rsvpCount: FieldValue.increment(-1),
    updatedAt: Timestamp.now(),
  });
});
```

**Index required:** None — direct document read by known path.
**Security note:** The session cookie (verified via `getSession()` in the Server Action) is the sole credential. The document ID is the user's UID — an attendee can only cancel their own RSVP, since `userId` from their session is used as the document path. No token infrastructure required.

---

### Q6 — "My RSVPs" — attendee's own RSVP history (implemented in v1)

**All RSVPs for the authenticated attendee, across all events, newest first.**

```ts
// Collection group query: scans all rsvps subcollections across the database
// filtered by the current user's UID.
const myRsvps = db
  .collectionGroup("rsvps")
  .where("userId", "==", session.uid)
  .where("cancelledAt", "==", null)
  .orderBy("createdAt", "desc");

const snap = await myRsvps.get();
// Each document includes eventSnapshot.{title, startsAt, location}
// — no additional event reads needed for display
```

**Collection group index required:** `(userId ASC, cancelledAt ASC, createdAt DESC)`.
This must be deployed to Firestore before the `/my-rsvps` page goes live. See §6.
**Note:** Showing cancelled RSVPs (e.g., a "past RSVPs" section) would remove the `cancelledAt == null` filter and sort by `cancelledAt DESC` instead — the index would need to be updated at that point.

---

## 6. Index Manifest (`firestore.indexes.json`)

```json
{
  "indexes": [
    {
      "collectionGroup": "rsvps",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "cancelledAt", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "rsvps",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "cancelledAt", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

**Two composite indexes for the entire v1 data model:**

1. **`(cancelledAt, createdAt)` — COLLECTION scope.** Used by Q4 (organizer's confirmed attendee list for a specific event). The `COLLECTION` scope means it only applies within a single `rsvps` subcollection, not across all subcollections.

2. **`(userId, cancelledAt, createdAt)` — COLLECTION_GROUP scope.** Used by Q6 (My RSVPs — attendee's own RSVP history). The `COLLECTION_GROUP` scope lets Firestore search across all `rsvps` subcollections in the database filtered by `userId`.

The events collection requires no composite indexes in v1 because the organizer dashboard query uses a single `orderBy` field (covered by Firestore's automatic single-field indexes). The `cancelToken` index from the email-only model is not needed.

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
                           Attendee: own RSVPs via          No client writes
                           getMyRsvps() server action
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
| Separate attendee profile   | Auth profile (displayName, email) lives in Firebase Auth; no separate Firestore record needed in v1                                                                               | Add `/attendees/{uid}` collection for extended profile (bio, notification prefs, etc.)                      |
| RSVP snapshot sync          | `eventSnapshot` on RSVP is set at creation and not updated if organizer edits the event                                                                                           | Cloud Function propagates event field changes to `eventSnapshot` on all RSVPs; or re-query event on display |
| Event images                | No Storage in v1                                                                                                                                                                  | Add `coverImageUrl: string \| null` to `EventDoc`; Cloud Function generates thumbnail URL                   |
| Waitlist                    | Capacity closes RSVPs in v1                                                                                                                                                       | Add `waitlist` subcollection parallel to `rsvps`; promote on cancellation                                   |

---
