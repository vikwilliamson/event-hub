import { EVENT_CATEGORIES, type Event, type EventCategory } from "@/lib/types";
import { findCity } from "@/lib/cities";
import { haversineKm, filterByRadius, type LatLng } from "@/lib/geo";

export const DEFAULT_RADIUS_KM = 50;

export interface EventSearchQuery {
  /** Case-insensitive substring match on title, description, location, venue. */
  text?: string;
  category?: string;
  /** When set, only events with coordinates inside the radius are returned, sorted by distance. */
  near?: LatLng | null;
  radiusKm?: number;
}

export function searchEvents(events: Event[], query: EventSearchQuery): Event[] {
  let results = events;

  const text = query.text?.trim().toLowerCase();
  if (text) {
    results = results.filter((event) =>
      [event.title, event.description, event.location, event.venueName ?? ""]
        .join("\n")
        .toLowerCase()
        .includes(text)
    );
  }

  if (query.category) {
    results = results.filter((event) => event.category === query.category);
  }

  if (query.near) {
    const center = query.near;
    results = filterByRadius(results, center, query.radiusKm ?? DEFAULT_RADIUS_KM);
    return [...results].sort(
      (a, b) =>
        haversineKm(center, { lat: a.lat!, lng: a.lng! }) -
        haversineKm(center, { lat: b.lat!, lng: b.lng! })
    );
  }

  return [...results].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Translate URL search params (`?q=&category=&near=&radius=`) into an
 * EventSearchQuery. Unknown categories/cities and malformed radii are
 * dropped rather than erroring — a shared URL should never break the page.
 */
export function parseEventSearchParams(params: RawSearchParams): EventSearchQuery {
  const first = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const query: EventSearchQuery = {};

  const text = first("q")?.trim();
  if (text) query.text = text;

  const category = first("category");
  if (category && (EVENT_CATEGORIES as readonly string[]).includes(category)) {
    query.category = category as EventCategory;
  }

  const city = findCity(first("near"));
  if (city) {
    query.near = { lat: city.lat, lng: city.lng };
    const radius = Number(first("radius"));
    query.radiusKm =
      Number.isFinite(radius) && radius > 0 ? radius : DEFAULT_RADIUS_KM;
  }

  return query;
}
