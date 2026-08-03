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

import { extractionToSearchParams, parseNaturalSearch } from "@/lib/ai/nl-search";
import { generateEventDescription } from "@/lib/ai/describe-event";

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
