import { getAllPublishedEvents } from "@/lib/firebase/public-db";
import { EventCard } from "@/components/event/event-card";
import Link from "next/link";

export default async function EventsPage() {
  const events = await getAllPublishedEvents();

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
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">Upcoming Events</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {pastEvents.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">Past Events</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pastEvents.map((event) => (
              <EventCard key={event.id} event={event} />
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
            There are no published events yet. Check back later!
          </p>
        </div>
      )}
    </div>
  );
}
