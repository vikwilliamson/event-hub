import { getAllPublishedEvents } from "@/lib/events-public";
import { searchEvents, parseEventSearchParams, type RawSearchParams } from "@/lib/search";
import { haversineKm } from "@/lib/geo";
import type { Event } from "@/lib/types";
import { env } from "@/lib/env";
import { EventCard } from "@/components/event/event-card";
import { EventSearchForm } from "@/components/event/event-search-form";
import { NlSearchForm } from "@/components/event/nl-search-form";
import { EventsMap } from "@/components/event/events-map";
import Link from "next/link";

interface EventsPageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const query = parseEventSearchParams(params);
  const hasActiveFilters = Object.keys(query).length > 0;

  const allEvents = await getAllPublishedEvents();
  const events = searchEvents(allEvents, query);

  const now = new Date();
  const upcomingEvents = events.filter((event) => event.startsAt > now);
  const pastEvents = events.filter((event) => event.startsAt <= now);

  const center = query.near ?? null;
  const distanceFor = (event: Event) =>
    center && event.lat !== null && event.lng !== null
      ? haversineKm(center, { lat: event.lat, lng: event.lng })
      : undefined;

  const mapEvents = upcomingEvents
    .filter((event) => event.lat !== null && event.lng !== null)
    .map((event) => ({
      id: event.id,
      title: event.title,
      lat: event.lat as number,
      lng: event.lng as number,
    }));

  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Browse Events</h1>
        <p className="text-lg text-neutral-600">
          Discover and RSVP to events happening in your area.
        </p>
      </div>

      <div className="mb-6">
        <Link
          href="/my-rsvps"
          className="inline-flex items-center px-4 py-2 bg-neutral-100 text-neutral-900 rounded-md hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          My RSVPs
        </Link>
      </div>

      {env.ANTHROPIC_API_KEY && <NlSearchForm />}

      <EventSearchForm
        defaults={{
          q: first(params.q),
          category: first(params.category),
          near: first(params.near),
          radius: first(params.radius),
        }}
        hasActiveFilters={hasActiveFilters}
      />

      <EventsMap events={mapEvents} center={center} />

      {upcomingEvents.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">Upcoming Events</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} distanceKm={distanceFor(event)} />
            ))}
          </div>
        </section>
      )}

      {pastEvents.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">Past Events</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pastEvents.map((event) => (
              <EventCard key={event.id} event={event} distanceKm={distanceFor(event)} />
            ))}
          </div>
        </section>
      )}

      {events.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-neutral-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No events found</h3>
          <p className="text-neutral-600">
            {hasActiveFilters
              ? "No events match your filters. Try widening the search."
              : "There are no published events yet. Check back later!"}
          </p>
        </div>
      )}
    </div>
  );
}
