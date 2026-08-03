import { describe, it, expect } from "vitest";
import { haversineKm, filterByRadius } from "@/lib/geo";

const NYC = { lat: 40.7128, lng: -74.006 };
const LA = { lat: 34.0522, lng: -118.2437 };
const NEWARK = { lat: 40.7357, lng: -74.1724 };

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm(NYC, NYC)).toBe(0);
  });

  it("computes NYC → LA within 1% of ~3936 km", () => {
    const d = haversineKm(NYC, LA);
    expect(d).toBeGreaterThan(3896);
    expect(d).toBeLessThan(3976);
  });

  it("computes short distances (NYC → Newark ≈ 14 km)", () => {
    const d = haversineKm(NYC, NEWARK);
    expect(d).toBeGreaterThan(13);
    expect(d).toBeLessThan(15.5);
  });

  it("is symmetric", () => {
    expect(haversineKm(NYC, LA)).toBeCloseTo(haversineKm(LA, NYC), 6);
  });
});

describe("filterByRadius", () => {
  const center = { lat: 0, lng: 0 };
  const items = [
    { name: "at-center", lat: 0, lng: 0 },
    { name: "near", lat: 0.05, lng: 0 }, // ~5.6 km
    { name: "far", lat: 1, lng: 0 }, // ~111 km
    { name: "no-coords", lat: null, lng: null },
  ];

  it("keeps only items within the radius", () => {
    const result = filterByRadius(items, center, 10);
    expect(result.map((i) => i.name)).toEqual(["at-center", "near"]);
  });

  it("includes items exactly at the boundary", () => {
    const p = { name: "boundary", lat: 0.3, lng: 0.2 };
    const exact = haversineKm(center, { lat: p.lat, lng: p.lng });
    const result = filterByRadius([p], center, exact);
    expect(result).toHaveLength(1);
  });

  it("excludes items without coordinates", () => {
    const result = filterByRadius(items, center, 100000);
    expect(result.find((i) => i.name === "no-coords")).toBeUndefined();
  });
});
