import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { rsvpEvent, cancelRsvp } from "@/lib/actions/rsvp.actions";
import { seedTestDatabase, createTestEvent, cleanupTestDatabase } from "../factories/test-data.factory";

vi.mock("@/lib/firebase/auth.server", () => ({
  getSession: vi.fn(),
}));

// Silence fire-and-forget email errors in tests
vi.mock("@/lib/email", () => ({
  sendRsvpConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

describe("RSVP Flow", () => {
  let db: ReturnType<typeof getAdminFirestore>;
  let testOrganizerId: string;
  let testEvent: ReturnType<typeof createTestEvent>;
  let testUserId: string;

  beforeEach(async () => {
    const setup = await seedTestDatabase();
    db = getAdminFirestore();
    testOrganizerId = setup.organizerId;
    testEvent = setup.events[0];
    testUserId = "test-user-123";

    await db.collection("users").doc(testUserId).set({
      email: "test@example.com",
      displayName: "Test User",
    });
  });

  afterEach(async () => {
    await cleanupTestDatabase(testOrganizerId);
    await db.collection("users").doc(testUserId).delete();
    vi.clearAllMocks();
  });

  async function mockSession(uid = testUserId) {
    const { getSession } = await import("@/lib/firebase/auth.server");
    vi.mocked(getSession).mockResolvedValue({ uid, email: "test@example.com" });
  }

  describe("Unit Tests", () => {
    it("should create RSVP successfully", async () => {
      await mockSession();
      const result = await rsvpEvent(testEvent.id, testOrganizerId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.rsvp.eventId).toBe(testEvent.id);
        expect(result.data.rsvp.userId).toBe(testUserId);
        expect(result.data.rsvp.organizerId).toBe(testOrganizerId);
        expect(result.data.rsvp.cancelledAt).toBeNull();
      }
    });

    it("should prevent duplicate RSVPs", async () => {
      await mockSession();
      const firstResult = await rsvpEvent(testEvent.id, testOrganizerId);
      expect(firstResult.ok).toBe(true);

      const secondResult = await rsvpEvent(testEvent.id, testOrganizerId);
      expect(secondResult.ok).toBe(false);
      if (!secondResult.ok) {
        expect(secondResult.error).toMatch(/already RSVP/i);
      }
    });

    it("should cancel RSVP successfully", async () => {
      await mockSession();
      await rsvpEvent(testEvent.id, testOrganizerId);
      const cancelResult = await cancelRsvp(testEvent.id, testOrganizerId);

      expect(cancelResult.ok).toBe(true);
      if (cancelResult.ok) {
        expect(cancelResult.data.rsvp.cancelledAt).not.toBeNull();
      }
    });
  });

  describe("Integration Tests", () => {
    it("should update event RSVP count atomically", async () => {
      await mockSession();
      const eventRef = db
        .collection("organizers")
        .doc(testOrganizerId)
        .collection("events")
        .doc(testEvent.id);

      const initialSnap = await eventRef.get();
      const initialCount = initialSnap.data()?.rsvpCount ?? 0;

      await rsvpEvent(testEvent.id, testOrganizerId);

      const finalSnap = await eventRef.get();
      expect(finalSnap.data()?.rsvpCount).toBe(initialCount + 1);
    });

    it("should decrement RSVP count on cancellation", async () => {
      await mockSession();
      await rsvpEvent(testEvent.id, testOrganizerId);

      const eventRef = db
        .collection("organizers")
        .doc(testOrganizerId)
        .collection("events")
        .doc(testEvent.id);

      const afterRsvpSnap = await eventRef.get();
      const afterRsvpCount = afterRsvpSnap.data()?.rsvpCount ?? 0;

      await cancelRsvp(testEvent.id, testOrganizerId);

      const finalSnap = await eventRef.get();
      expect(finalSnap.data()?.rsvpCount).toBe(afterRsvpCount - 1);
    });

    it("should store RSVP in correct collection hierarchy", async () => {
      await mockSession();
      const result = await rsvpEvent(testEvent.id, testOrganizerId);
      expect(result.ok).toBe(true);

      const rsvpSnap = await db
        .collection("organizers")
        .doc(testOrganizerId)
        .collection("events")
        .doc(testEvent.id)
        .collection("rsvps")
        .doc(testUserId)
        .get();

      expect(rsvpSnap.exists).toBe(true);
      expect(rsvpSnap.data()?.userId).toBe(testUserId);
      expect(rsvpSnap.data()?.eventSnapshot?.title).toBe(testEvent.title);
    });

    it("should handle concurrent RSVP attempts — only one succeeds", async () => {
      await mockSession();
      const results = await Promise.allSettled([
        rsvpEvent(testEvent.id, testOrganizerId),
        rsvpEvent(testEvent.id, testOrganizerId),
        rsvpEvent(testEvent.id, testOrganizerId),
      ]);

      const successCount = results.filter(
        (r) => r.status === "fulfilled" && r.value.ok
      ).length;
      expect(successCount).toBe(1);

      const eventSnap = await db
        .collection("organizers")
        .doc(testOrganizerId)
        .collection("events")
        .doc(testEvent.id)
        .get();
      expect(eventSnap.data()?.rsvpCount).toBe(1);
    });
  });
});
