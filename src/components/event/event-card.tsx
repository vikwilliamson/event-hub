import Link from "next/link";
import type { EventStatus } from "@/lib/firebase/types";

/** Event as received from Server Action (dates serialized to ISO strings). */
export type EventListItem = {
  id: string;
  organizerId: string;
  organizerName: string;
  title: string;
  description: string;
  location: string;
  startsAt: string | Date;
  endsAt: string | Date | null;
  capacity: number | null;
  rsvpCount: number;
  status: EventStatus;
  createdAt: string | Date;
  updatedAt: string | Date;
  cancelledAt: string | Date | null;
  publishedAt: string | Date | null;
};

function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(status: EventStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "published":
      return "Published";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export interface EventCardProps {
  event: EventListItem;
}

/**
 * Compact card for event list: title, date, status, RSVP count, link to organizer view.
 */
export function EventCard({ event }: EventCardProps) {
  return (
    <article
      className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      aria-labelledby={`event-title-${event.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 id={`event-title-${event.id}`} className="text-lg font-semibold text-neutral-900">
            <Link
              href={`/dashboard/events/${event.id}`}
              className="focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded"
            >
              {event.title}
            </Link>
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            <time dateTime={typeof event.startsAt === "string" ? event.startsAt : event.startsAt.toISOString()}>
              {formatDate(event.startsAt)}
            </time>
          </p>
          <p className="mt-1 text-sm text-neutral-500">{event.location}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-700 data-[status=published]:bg-green-100 data-[status=published]:text-green-800 data-[status=cancelled]:bg-red-100 data-[status=cancelled]:text-red-800"
            aria-label={`Status: ${statusLabel(event.status)}`}
            data-status={event.status}
          >
            {statusLabel(event.status)}
          </span>
          <span className="text-sm text-neutral-500" aria-label={`${event.rsvpCount} RSVPs`}>
            {event.rsvpCount} RSVP{event.rsvpCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
      {event.description && (
        <p className="mt-2 line-clamp-2 text-sm text-neutral-600">
          {event.description}
        </p>
      )}
    </article>
  );
}
