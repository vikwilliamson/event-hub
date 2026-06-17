import { notFound } from "next/navigation";
import { findEventById } from "@/lib/firebase/public-db";
import { RsvpButton } from "@/components/event/rsvp-button";
import type { Event } from "@/lib/firebase/types";

type Props = { params: Promise<{ id: string }> };

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  if (!id) notFound();

  const result = await findEventById(id);
  if (!result) notFound();

  const { event, organizerId } = result;

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

  const isUpcoming = event.startsAt > new Date();
  const isCancelled = event.status === "cancelled";

  return (
    <article className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-bold text-neutral-900">{event.title}</h1>
          <div className="ml-4">
            {isCancelled && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                Cancelled
              </span>
            )}
            {event.status === "draft" && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                Draft
              </span>
            )}
          </div>
        </div>
        
        <p className="text-lg text-neutral-600 mb-2">by {event.organizerName}</p>
        
        <div className="flex flex-wrap gap-4 text-sm text-neutral-600 mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {event.location}
          </div>

          <div className="flex items-center" aria-live="polite" aria-atomic="true">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {event.rsvpCount} {event.rsvpCount === 1 ? "person" : "people"} going
            {event.capacity && ` • ${event.capacity - event.rsvpCount} spots left`}
          </div>
        </div>

        {event.status === "published" && !isCancelled && isUpcoming && (
          <div className="mb-6">
            <RsvpButton
              eventId={event.id}
              organizerId={organizerId}
              variant="primary"
              size="lg"
            />
          </div>
        )}
      </div>

      <div className="prose max-w-none">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">About this event</h2>
        <div className="whitespace-pre-wrap text-neutral-700">
          {event.description || "No description provided."}
        </div>
      </div>

      {event.capacity && (
        <div className="mt-8 p-4 bg-neutral-50 rounded-lg">
          <h3 className="font-medium text-neutral-900 mb-2">Capacity</h3>
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div 
              className="bg-neutral-900 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((event.rsvpCount / event.capacity) * 100, 100)}%` }}
            />
          </div>
          <p className="text-sm text-neutral-600 mt-2">
            {event.rsvpCount} of {event.capacity} spots filled
            {event.capacity - event.rsvpCount <= 5 && ` • Only ${event.capacity - event.rsvpCount} spots left!`}
          </p>
        </div>
      )}
    </article>
  );
}
