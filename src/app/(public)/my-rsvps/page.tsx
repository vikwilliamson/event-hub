"use client";

import { useMyRsvps } from "@/hooks/use-rsvp";
import { RsvpButton } from "@/components/event/rsvp-button";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cancelRsvp } from "@/lib/actions/rsvp.actions";

export default function MyRsvpsPage() {
  const { rsvps, isLoading, error, refetch } = useMyRsvps();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  };

  const handleCancelRsvp = async (eventId: string, organizerId: string) => {
    try {
      const result = await cancelRsvp(eventId, organizerId);
      if (result.ok) {
        refetch(); // Refresh the list
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel RSVP");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-neutral-200 rounded-lg p-6">
                <div className="h-6 bg-neutral-200 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-neutral-900 mb-2">Error loading RSVPs</h3>
          <p className="text-neutral-600 mb-4">{error}</p>
          <Button onClick={refetch}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">My RSVPs</h1>
        <p className="text-lg text-neutral-600">
          Manage your event RSVPs and see upcoming events you're attending.
        </p>
      </div>

      <div className="mb-6">
        <Link
          href="/events"
          className="inline-flex items-center px-4 py-2 bg-neutral-100 text-neutral-900 rounded-md hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Browse Events
        </Link>
      </div>

      {rsvps.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-neutral-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No RSVPs yet</h3>
          <p className="text-neutral-600 mb-4">
            You haven't RSVP'd to any events yet. Start exploring events to attend!
          </p>
          <Link href="/events">
            <Button>Browse Events</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {rsvps.map((rsvp) => (
            <div key={rsvp.id} className="border border-neutral-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                    <Link 
                      href={`/events/${rsvp.eventId}`}
                      className="hover:text-neutral-600 focus:outline-none focus:underline"
                    >
                      {rsvp.eventSnapshot?.title || "Event"}
                    </Link>
                  </h3>
                  {rsvp.eventSnapshot && (
                    <div className="space-y-1 text-sm text-neutral-600">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(rsvp.eventSnapshot.startsAt)}
                      </div>
                      
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {rsvp.eventSnapshot.location}
                      </div>
                    </div>
                  )}
                </div>
                <div className="ml-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Going
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Link
                  href={`/events/${rsvp.eventId}`}
                  className="text-sm font-medium text-neutral-900 hover:text-neutral-600 focus:outline-none focus:underline"
                >
                  View details →
                </Link>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancelRsvp(rsvp.eventId, rsvp.organizerId)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Cancel RSVP
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
