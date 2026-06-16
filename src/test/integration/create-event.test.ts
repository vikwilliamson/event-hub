import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { createEvent as createEventAction } from "@/lib/actions/event.actions";
import { seedTestDatabase, cleanupTestDatabase } from "../factories/test-data.factory";

vi.mock("@/lib/firebase/auth.server", () => ({
  getSession: vi.fn(),
}));

describe("Create Event Flow", () => {
  let db: ReturnType<typeof getAdminFirestore>;
  let testOrganizerId: string;

  beforeEach(async () => {
    const setup = await seedTestDatabase();
    db = getAdminFirestore();
    testOrganizerId = setup.organizerId;
  });

  afterEach(async () => {
    await cleanupTestDatabase(testOrganizerId);
    vi.clearAllMocks();
  });

  async function mockSession(uid = testOrganizerId) {
    const { getSession } = await import("@/lib/firebase/auth.server");
    vi.mocked(getSession).mockResolvedValue({ uid, email: "test@example.com" });
  }

  const validPayload = () => ({
    title: "Test Event",
    description: "A test event",
    location: "Test Location",
    startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: "published" as const,
  });

  describe("Validation", () => {
    it("should accept valid payload", async () => {
      await mockSession();
      const result = await createEventAction(validPayload());
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(typeof result.data.eventId).toBe("string");
      }
    });

    it("should reject empty title", async () => {
      await mockSession();
      const result = await createEventAction({ ...validPayload(), title: "" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors).toBeDefined();
      }
    });

    it("should reject invalid date", async () => {
      await mockSession();
      const result = await createEventAction({ ...validPayload(), startsAt: "not-a-date" });
      expect(result.ok).toBe(false);
    });
  });

  describe("Integration", () => {
    it("should persist event to Firestore", async () => {
      await mockSession();
      const payload = { ...validPayload(), title: "Integration Test Event" };
      const result = await createEventAction(payload);
      expect(result.ok).toBe(true);

      if (result.ok) {
        const snap = await db
          .collection("organizers")
          .doc(testOrganizerId)
          .collection("events")
          .doc(result.data.eventId)
          .get();

        expect(snap.exists).toBe(true);
        expect(snap.data()?.title).toBe(payload.title);
        expect(snap.data()?.rsvpCount).toBe(0);
        expect(snap.data()?.status).toBe("published");
      }
    });

    it("should increment the event collection count", async () => {
      await mockSession();
      const before = await db
        .collection("organizers")
        .doc(testOrganizerId)
        .collection("events")
        .get();

      await createEventAction(validPayload());

      const after = await db
        .collection("organizers")
        .doc(testOrganizerId)
        .collection("events")
        .get();

      expect(after.docs.length).toBe(before.docs.length + 1);
    });
  });
});
