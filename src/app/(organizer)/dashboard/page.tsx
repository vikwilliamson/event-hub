import Link from "next/link";
import { getOrganizerEvents } from "@/lib/actions/event.actions";
import { EventCard } from "@/components/event/event-card";

export default async function DashboardPage() {
  // Get all events without authentication requirement
  const result = await getOrganizerEvents();
  
  if (!result.ok) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-neutral-900 mb-4">Dashboard</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error loading events</h2>
          <p className="text-red-700">{result.error}</p>
        </div>
      </div>
    );
  }

  const events = result.data || [];
  const publishedEvents = events.filter(event => event.status === "published");
  const draftEvents = events.filter(event => event.status === "draft");
  const totalRsvps = events.reduce((sum, event) => sum + event.rsvpCount, 0);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Dashboard</h1>
        <p className="text-neutral-600">
          Browse and manage your events. No authentication required.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Total Events</h3>
          <p className="text-3xl font-bold text-blue-600">{events.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Published</h3>
          <p className="text-3xl font-bold text-green-600">{publishedEvents.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Total RSVPs</h3>
          <p className="text-3xl font-bold text-purple-600">{totalRsvps}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-neutral-900">Your Events</h2>
        <Link 
          href="/events/create"
          className="rounded bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
        >
          Create Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">No events yet</h3>
          <p className="text-neutral-600 mb-6">
            Create your first event to get started.
          </p>
          <Link 
            href="/events/create"
            className="rounded bg-neutral-900 px-6 py-3 text-white hover:bg-neutral-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            Create Your First Event
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Published Events */}
          {publishedEvents.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Published Events</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publishedEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {/* Draft Events */}
          {draftEvents.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Draft Events</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {draftEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
