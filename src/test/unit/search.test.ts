import { describe, it, expect } from "vitest";
import { searchEvents, parseEventSearchParams, DEFAULT_RADIUS_KM } from "@/lib/search";
import { makeEvent, daysFromNow } from "../factories/factories";

const DENVER = { lat: 39.7392, lng: -104.9903 };
const BOULDER = { lat: 40.015, lng: -105.2705 }; // ~38 km from Denver
const AUSTIN = { lat: 30.2672, lng: -97.7431 };

const events = [
  makeEvent({
    id: "tech-denver",
    title: "Denver TypeScript Meetup",
    description: "Monthly TS talks",
    location: "Denver, CO",
    venueName: "Union Station",
    category: "tech",
    lat: DENVER.lat,
    lng: DENVER.lng,
    startsAt: daysFromNow(3),
  }),
  makeEvent({
    id: "music-boulder",
    title: "Boulder Bluegrass Night",
    description: "Live bands on the porch",
    location: "Boulder, CO",
    category: "music",
    lat: BOULDER.lat,
    lng: BOULDER.lng,
    startsAt: daysFromNow(1),
  }),
  makeEvent({
    id: "food-austin",
    title: "Austin Taco Crawl",
    description: "A tour of the best tacos in town",
    location: "Austin, TX",
    category: "food",
    lat: AUSTIN.lat,
    lng: AUSTIN.lng,
    startsAt: daysFromNow(5),
  }),
  makeEvent({
    id: "no-coords",
    title: "Online Networking Hour",
    description: "Remote-friendly meetup about tacos",
    location: "Online",
    category: "community",
    lat: null,
    lng: null,
    startsAt: daysFromNow(2),
  }),
];

describe("searchEvents", () => {
  it("returns all events sorted by start date when query is empty", () => {
    const result = searchEvents(events, {});
    expect(result.map((e) => e.id)).toEqual([
      "music-boulder",
      "no-coords",
      "tech-denver",
      "food-austin",
    ]);
  });

  it("matches text against title, case-insensitively", () => {
    const result = searchEvents(events, { text: "typescript" });
    expect(result.map((e) => e.id)).toEqual(["tech-denver"]);
  });

  it("matches text against description", () => {
    const result = searchEvents(events, { text: "tacos" });
    expect(result.map((e) => e.id)).toEqual(["no-coords", "food-austin"]);
  });

  it("matches text against location and venue name", () => {
    expect(searchEvents(events, { text: "boulder, co" }).map((e) => e.id)).toEqual([
      "music-boulder",
    ]);
    expect(searchEvents(events, { text: "union station" }).map((e) => e.id)).toEqual([
      "tech-denver",
    ]);
  });

  it("filters by category", () => {
    const result = searchEvents(events, { category: "music" });
    expect(result.map((e) => e.id)).toEqual(["music-boulder"]);
  });

  it("filters by radius around a center and sorts by distance", () => {
    const result = searchEvents(events, { near: DENVER, radiusKm: 50 });
    expect(result.map((e) => e.id)).toEqual(["tech-denver", "music-boulder"]);
  });

  it("excludes events without coordinates from location searches", () => {
    const result = searchEvents(events, { near: DENVER, radiusKm: 100000 });
    expect(result.find((e) => e.id === "no-coords")).toBeUndefined();
  });

  it("combines text, category, and location filters", () => {
    const result = searchEvents(events, {
      text: "meetup",
      category: "tech",
      near: DENVER,
      radiusKm: 50,
    });
    expect(result.map((e) => e.id)).toEqual(["tech-denver"]);
  });

  it("returns empty array when nothing matches", () => {
    expect(searchEvents(events, { text: "zzz-no-match" })).toEqual([]);
  });
});

describe("parseEventSearchParams", () => {
  it("returns an empty query for empty params", () => {
    expect(parseEventSearchParams({})).toEqual({});
  });

  it("maps q to trimmed text and drops blank q", () => {
    expect(parseEventSearchParams({ q: "  tacos " })).toEqual({ text: "tacos" });
    expect(parseEventSearchParams({ q: "   " })).toEqual({});
  });

  it("accepts known categories and ignores unknown ones", () => {
    expect(parseEventSearchParams({ category: "music" })).toEqual({ category: "music" });
    expect(parseEventSearchParams({ category: "nonsense" })).toEqual({});
  });

  it("resolves a known city slug to its coordinates with the default radius", () => {
    expect(parseEventSearchParams({ near: "denver" })).toEqual({
      near: { lat: 39.7392, lng: -104.9903 },
      radiusKm: DEFAULT_RADIUS_KM,
    });
  });

  it("ignores unknown city slugs", () => {
    expect(parseEventSearchParams({ near: "atlantis" })).toEqual({});
  });

  it("parses a positive radius, falling back to the default for bad values", () => {
    expect(parseEventSearchParams({ near: "denver", radius: "25" })).toMatchObject({
      radiusKm: 25,
    });
    expect(parseEventSearchParams({ near: "denver", radius: "-5" })).toMatchObject({
      radiusKm: DEFAULT_RADIUS_KM,
    });
    expect(parseEventSearchParams({ near: "denver", radius: "abc" })).toMatchObject({
      radiusKm: DEFAULT_RADIUS_KM,
    });
  });

  it("ignores radius without a resolvable center", () => {
    expect(parseEventSearchParams({ radius: "25" })).toEqual({});
  });

  it("uses the first value when a param is repeated", () => {
    expect(parseEventSearchParams({ q: ["tacos", "music"] })).toEqual({ text: "tacos" });
  });
});
