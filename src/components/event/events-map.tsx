"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { LatLng } from "@/lib/geo";

export interface MapEvent {
  id: string;
  title: string;
  lat: number;
  lng: number;
}

interface EventsMapProps {
  events: MapEvent[];
  /** Active search center; map centers here when set, else fits all markers. */
  center?: LatLng | null;
}

declare global {
  interface Window {
    google?: typeof google;
  }
}

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const SCRIPT_ID = "google-maps-js";

type GoogleMaps = typeof google;

function loadGoogleMaps(apiKey: string): Promise<GoogleMaps> {
  if (typeof window !== "undefined" && window.google?.maps) {
    return Promise.resolve(window.google);
  }
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    const onLoad = () =>
      window.google
        ? resolve(window.google)
        : reject(new Error("Google Maps failed to load"));
    const onError = () => reject(new Error("Google Maps failed to load"));
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async`;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

/**
 * Map of event locations. Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; without
 * it (or with no mappable events) renders nothing — the list below is the
 * canonical view either way.
 */
export function EventsMap({ events, center }: EventsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!MAPS_API_KEY || events.length === 0 || !containerRef.current) return;

    let cancelled = false;
    const container = containerRef.current;

    loadGoogleMaps(MAPS_API_KEY)
      .then((g) => {
        if (cancelled) return;

        const map = new g.maps.Map(container, {
          center: center ?? { lat: events[0].lat, lng: events[0].lng },
          zoom: center ? 10 : 4,
          mapTypeControl: false,
          streetViewControl: false,
        });

        const bounds = new g.maps.LatLngBounds();
        for (const event of events) {
          const position = { lat: event.lat, lng: event.lng };
          bounds.extend(position);
          const marker = new g.maps.Marker({ map, position, title: event.title });
          marker.addListener("click", () => router.push(`/events/${event.id}`));
        }

        if (!center && events.length > 1) {
          map.fitBounds(bounds, 48);
        }
      })
      .catch(() => {
        // Map is progressive enhancement; the event list still renders.
      });

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [events, center, router]);

  if (!MAPS_API_KEY) {
    return (
      <p className="mb-8 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
        Map view is off — set <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to
        see events on a map. Location search works without it.
      </p>
    );
  }

  if (events.length === 0) return null;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Map of event locations"
      className="mb-8 h-80 w-full overflow-hidden rounded-lg border border-neutral-200"
    />
  );
}
