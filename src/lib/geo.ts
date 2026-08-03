export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points, in kilometers. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Items within `radiusKm` of `center` (boundary inclusive).
 * Items without coordinates are excluded — they can't be placed.
 */
export function filterByRadius<T extends { lat: number | null; lng: number | null }>(
  items: T[],
  center: LatLng,
  radiusKm: number
): T[] {
  return items.filter(
    (item) =>
      item.lat !== null &&
      item.lng !== null &&
      haversineKm(center, { lat: item.lat, lng: item.lng }) <= radiusKm
  );
}
