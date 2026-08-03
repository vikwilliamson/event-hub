import { describe, it, expect } from "vitest";
import { validateCreateEventPayload } from "@/lib/validations/event.schema";
import { makeEventPayload, daysFromNow } from "../factories/factories";

describe("validateCreateEventPayload", () => {
  it("accepts a valid minimal payload", () => {
    const result = validateCreateEventPayload(makeEventPayload());
    expect(result.success).toBe(true);
  });

  it("accepts optional venue, category, and coordinates", () => {
    const result = validateCreateEventPayload(
      makeEventPayload({
        venueName: "Union Station",
        category: "tech",
        lat: 39.7392,
        lng: -104.9903,
      })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.venueName).toBe("Union Station");
      expect(result.data.category).toBe("tech");
      expect(result.data.lat).toBeCloseTo(39.7392);
    }
  });

  it("rejects an empty title with a field error", () => {
    const result = validateCreateEventPayload(makeEventPayload({ title: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.title).toBeDefined();
    }
  });

  it("coerces capacity from a string", () => {
    const result = validateCreateEventPayload(makeEventPayload({ capacity: "25" }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.capacity).toBe(25);
  });

  it("rejects out-of-range coordinates", () => {
    expect(
      validateCreateEventPayload(makeEventPayload({ lat: 91, lng: 0 })).success
    ).toBe(false);
    expect(
      validateCreateEventPayload(makeEventPayload({ lat: 0, lng: 181 })).success
    ).toBe(false);
  });

  it("rejects lat without lng (and vice versa)", () => {
    expect(validateCreateEventPayload(makeEventPayload({ lat: 39.7 })).success).toBe(
      false
    );
    expect(validateCreateEventPayload(makeEventPayload({ lng: -104.9 })).success).toBe(
      false
    );
  });

  it("rejects an unknown category", () => {
    const result = validateCreateEventPayload(
      makeEventPayload({ category: "underwater-basket-weaving" })
    );
    expect(result.success).toBe(false);
  });

  it("rejects publishing with a past start date", () => {
    const result = validateCreateEventPayload(
      makeEventPayload({ startsAt: daysFromNow(-1).toISOString(), status: "published" })
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.fieldErrors?.startsAt).toBeDefined();
  });

  it("allows a past start date for drafts", () => {
    const result = validateCreateEventPayload(
      makeEventPayload({ startsAt: daysFromNow(-1).toISOString(), status: "draft" })
    );
    expect(result.success).toBe(true);
  });
});
