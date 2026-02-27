import Link from "next/link";
import { RsvpButton } from "./rsvp-button";
import type { Event } from "@/lib/firebase/types";

interface EventCardProps {
  event: Event;
  className?: string;
}

/**
 * Event card component for displaying events in a list/grid.
 * Shows key event information and RSVP functionality.
 */
export function EventCard({ event, className }: EventCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  };

  const isUpcoming = event.startsAt > new Date();
  const isCancelled = event.status === "cancelled";

  return (
    <div className={`border border-neutral-200 rounded-lg p-6 hover:shadow-md transition-shadow ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-neutral-900 mb-1">
            <Link 
              href={`/events/${event.id}`}
              className="hover:text-neutral-600 focus:outline-none focus:underline"
            >
              {event.title}
            </Link>
          </h3>
          <p className="text-sm text-neutral-600">by {event.organizerName}</p>
        </div>
        <div className="ml-4">
          {isCancelled && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Cancelled
            </span>
          )}
          {event.status === "draft" && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Draft
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-neutral-600">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDate(event.startsAt)}
          {event.endsAt && (
            <>
              <span className="mx-1">-</span>
              {formatDate(event.endsAt)}
            </>
          )}
        </div>
        
        <div className="flex items-center text-sm text-neutral-600">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {event.location}
        </div>

        <div className="flex items-center text-sm text-neutral-600">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {event.rsvpCount} {event.rsvpCount === 1 ? "person" : "people"} going
          {event.capacity && ` • ${event.capacity - event.rsvpCount} spots left`}
        </div>
      </div>

      {event.description && (
        <p className="text-sm text-neutral-600 mb-4 line-clamp-2">
          {event.description}
        </p>
      )}

      <div className="flex justify-between items-center">
        <Link
          href={`/events/${event.id}`}
          className="text-sm font-medium text-neutral-900 hover:text-neutral-600 focus:outline-none focus:underline"
        >
          View details →
        </Link>
        
        {event.status === "published" && !isCancelled && isUpcoming && (
          <RsvpButton
            eventId={event.id}
            organizerId={event.organizerId}
            variant="primary"
            size="sm"
          />
        )}
      </div>
    </div>
  );
}
