import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

vi.mock("@/lib/env", () => ({
  env: { ANTHROPIC_API_KEY: "test-key" },
}));

import {
  extractionToSearchParams,
  parseNaturalSearch,
  widenSearchParamsIfEmpty,
  EXTRACTION_JSON_SCHEMA,
} from "@/lib/ai/nl-search";
import { generateEventDescription } from "@/lib/ai/describe-event";
import { makeEvent, daysFromNow } from "../factories/factories";

const textResponse = (text: string) => ({
  stop_reason: "end_turn",
  content: [{ type: "text", text }],
});

beforeEach(() => {
  mockCreate.mockReset();
});

describe("extractionToSearchParams", () => {
  it("maps a full extraction to URL search params", () => {
    const params = extractionToSearchParams(
      { text: "tech events", category: "tech", city: "denver", radiusKm: 25 },
      "free tech events near denver"
    );
    expect(Object.fromEntries(params)).toEqual({
      q: "tech events",
      category: "tech",
      near: "denver",
      radius: "25",
    });
  });

  it("omits null fields", () => {
    const params = extractionToSearchParams(
      { text: "bluegrass", category: null, city: null, radiusKm: null },
      "bluegrass"
    );
    expect(Object.fromEntries(params)).toEqual({ q: "bluegrass" });
  });

  it("drops unknown categories and cities but keeps the rest", () => {
    const params = extractionToSearchParams(
      { text: "shows", category: "opera", city: "atlantis", radiusKm: 10 },
      "opera shows in atlantis"
    );
    expect(Object.fromEntries(params)).toEqual({ q: "shows" });
  });

  it("ignores radius without a city and clamps out-of-range radii", () => {
    expect(
      Object.fromEntries(
        extractionToSearchParams(
          { text: null, category: null, city: null, radiusKm: 25 },
          "x"
        )
      )
    ).toEqual({});
    expect(
      extractionToSearchParams(
        { text: null, category: null, city: "denver", radiusKm: 99999 },
        "x"
      ).get("radius")
    ).toBe("500");
  });

  it("falls back to a plain text search on malformed extractions", () => {
    const params = extractionToSearchParams("not an object", "tacos in austin");
    expect(Object.fromEntries(params)).toEqual({ q: "tacos in austin" });
  });
});

describe("EXTRACTION_JSON_SCHEMA (structured-output validity)", () => {
  // The structured-outputs validator rejects an `enum` property whose `type`
  // is an array union (e.g. type: ["string","null"]) — it errors with
  // "Enum value 'x' does not match declared type '['string','null']'".
  // Nullable enums must be expressed with anyOf instead.
  it("never combines array-form type with enum", () => {
    for (const [name, prop] of Object.entries(
      EXTRACTION_JSON_SCHEMA.properties as Record<string, Record<string, unknown>>
    )) {
      if ("enum" in prop) {
        expect(Array.isArray(prop.type), `${name} must not use array-form type with enum`).toBe(
          false
        );
      }
      for (const branch of (prop.anyOf as Record<string, unknown>[] | undefined) ?? []) {
        if ("enum" in branch) {
          expect(
            Array.isArray(branch.type),
            `${name} anyOf branch must not use array-form type with enum`
          ).toBe(false);
        }
      }
    }
  });

  it("allows null for every field (all fields optional in intent)", () => {
    for (const [name, prop] of Object.entries(
      EXTRACTION_JSON_SCHEMA.properties as Record<string, Record<string, unknown>>
    )) {
      const branches = (prop.anyOf as Record<string, unknown>[] | undefined) ?? [];
      const nullable =
        prop.type === "null" ||
        (Array.isArray(prop.type) && prop.type.includes("null")) ||
        branches.some((b) => b.type === "null");
      expect(nullable, `${name} must permit null`).toBe(true);
    }
  });
});

describe("widenSearchParamsIfEmpty", () => {
  const DENVER = { lat: 39.7392, lng: -104.9903 };
  const events = [
    makeEvent({
      id: "tech-denver",
      title: "Denver TypeScript Meetup",
      description: "Monthly TS talks",
      location: "Denver, CO",
      category: "tech",
      lat: DENVER.lat,
      lng: DENVER.lng,
      startsAt: daysFromNow(3),
    }),
  ];

  it("drops a spurious q that zeros out results when category/near still match", () => {
    // q=free matches nothing, but category=tech near=denver matches the meetup.
    const params = new URLSearchParams("q=free&category=tech&near=denver");
    const widened = widenSearchParamsIfEmpty(params, events);
    expect(Object.fromEntries(widened)).toEqual({ category: "tech", near: "denver" });
  });

  it("keeps q when the full search still returns results", () => {
    const params = new URLSearchParams("q=typescript&category=tech&near=denver");
    const widened = widenSearchParamsIfEmpty(params, events);
    expect(Object.fromEntries(widened)).toEqual({
      q: "typescript",
      category: "tech",
      near: "denver",
    });
  });

  it("does not widen a pure text search with no other filter to fall back to", () => {
    const params = new URLSearchParams("q=nonexistent");
    const widened = widenSearchParamsIfEmpty(params, events);
    expect(Object.fromEntries(widened)).toEqual({ q: "nonexistent" });
  });

  it("returns params unchanged when there is no q", () => {
    const params = new URLSearchParams("category=tech&near=denver");
    const widened = widenSearchParamsIfEmpty(params, events);
    expect(Object.fromEntries(widened)).toEqual({ category: "tech", near: "denver" });
  });

  it("does not mutate the input params", () => {
    const params = new URLSearchParams("q=free&category=tech&near=denver");
    widenSearchParamsIfEmpty(params, events);
    expect(params.get("q")).toBe("free");
  });
});

describe("parseNaturalSearch", () => {
  it("returns params built from Claude's extraction", async () => {
    mockCreate.mockResolvedValue(
      textResponse(
        JSON.stringify({ text: "taco", category: "food", city: "austin", radiusKm: 50 })
      )
    );
    const params = await parseNaturalSearch("taco crawls near austin");
    expect(Object.fromEntries(params)).toEqual({
      q: "taco",
      category: "food",
      near: "austin",
      radius: "50",
    });
  });

  it("falls back to a plain text search when the API call fails", async () => {
    mockCreate.mockRejectedValue(new Error("boom"));
    const params = await parseNaturalSearch("music this weekend");
    expect(Object.fromEntries(params)).toEqual({ q: "music this weekend" });
  });

  it("falls back when the response is not valid JSON", async () => {
    mockCreate.mockResolvedValue(textResponse("I cannot help with that"));
    const params = await parseNaturalSearch("anything fun");
    expect(Object.fromEntries(params)).toEqual({ q: "anything fun" });
  });
});

describe("generateEventDescription", () => {
  it("returns the drafted description", async () => {
    mockCreate.mockResolvedValue(textResponse("  A great evening of talks.  "));
    const result = await generateEventDescription({
      title: "Denver TS Meetup",
      notes: "two speakers, pizza",
    });
    expect(result).toEqual({ ok: true, description: "A great evening of talks." });
  });

  it("returns an error when the API call fails", async () => {
    mockCreate.mockRejectedValue(new Error("boom"));
    const result = await generateEventDescription({ title: "Denver TS Meetup" });
    expect(result.ok).toBe(false);
  });

  it("returns an error when the response is empty", async () => {
    mockCreate.mockResolvedValue(textResponse("   "));
    const result = await generateEventDescription({ title: "Denver TS Meetup" });
    expect(result.ok).toBe(false);
  });
});
