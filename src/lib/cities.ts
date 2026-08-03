/** Preset search centers for location-based discovery (no geocoding API needed). */
export interface City {
  slug: string;
  name: string;
  lat: number;
  lng: number;
}

export const CITIES: City[] = [
  { slug: "denver", name: "Denver, CO", lat: 39.7392, lng: -104.9903 },
  { slug: "boulder", name: "Boulder, CO", lat: 40.015, lng: -105.2705 },
  { slug: "austin", name: "Austin, TX", lat: 30.2672, lng: -97.7431 },
  { slug: "san-francisco", name: "San Francisco, CA", lat: 37.7749, lng: -122.4194 },
  { slug: "seattle", name: "Seattle, WA", lat: 47.6062, lng: -122.3321 },
  { slug: "new-york", name: "New York, NY", lat: 40.7128, lng: -74.006 },
  { slug: "chicago", name: "Chicago, IL", lat: 41.8781, lng: -87.6298 },
  { slug: "portland", name: "Portland, OR", lat: 45.5152, lng: -122.6784 },
];

export function findCity(slug: string | undefined | null): City | null {
  if (!slug) return null;
  return CITIES.find((c) => c.slug === slug) ?? null;
}
