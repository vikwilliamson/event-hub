"use client";

import { useState, useEffect } from "react";
import { EventCard } from "@/components/event/event-card";
import { getPublishedEventsPaginated } from "@/lib/firebase/optimized-queries";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Event } from "@/lib/firebase/types";

interface EventsPageProps {
  initialEvents?: Event[];
}

export function OptimizedEventsPage({ initialEvents = [] }: EventsPageProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMoreEvents = async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getPublishedEventsPaginated(20, lastVisible);
      
      setEvents(prev => [...prev, ...result.events]);
      setHasMore(result.hasMore);
      setLastVisible(result.lastVisible);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more events");
    } finally {
      setIsLoading(false);
    }
  };

  const upcomingEvents = events.filter(event => event.startsAt > new Date());
  const pastEvents = events.filter(event => event.startsAt <= new Date());

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

      {upcomingEvents.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">
            Upcoming Events ({upcomingEvents.length})
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {pastEvents.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">
            Past Events ({pastEvents.length})
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pastEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {error && (
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">{error}</div>
          <Button onClick={loadMoreEvents} variant="secondary">
            Try Again
          </Button>
        </div>
      )}

      {hasMore && (
        <div className="text-center py-8">
          <Button
            onClick={loadMoreEvents}
            isLoading={isLoading}
            loadingLabel="Loading more events..."
            disabled={isLoading}
            variant="secondary"
            size="lg"
          >
            {isLoading ? "Loading..." : `Load More Events (${events.length} loaded)`}
          </Button>
        </div>
      )}

      {!hasMore && events.length > 0 && (
        <div className="text-center py-8 text-neutral-600">
          Showing all {events.length} events
        </div>
      )}

      {events.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-neutral-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No events found</h3>
          <p className="text-neutral-600">
            There are no published events yet. Check back later!
          </p>
        </div>
      )}
    </div>
  );
}
