import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/firebase/auth.server";
import { getEvent } from "@/lib/firebase/db";

type Props = { params: Promise<{ id: string }> };

/**
 * Organizer view of a single event. Used after create (redirect target) and for edit later.
 */
export default async function OrganizerEventPage({ params }: Props) {
  const session = await getSession();
  if (!session) {
    notFound();
  }

  const { id } = await params;
  const event = await getEvent(session.uid, id);
  if (!event) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">{event.title}</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Status: {event.status} · {event.rsvpCount} RSVP{event.rsvpCount !== 1 ? "s" : ""}
      </p>
      <p className="mt-4 text-neutral-600">{event.description}</p>
      <p className="mt-2 text-neutral-600">
        {event.location} · {event.startsAt.toLocaleString()}
      </p>

      <div className="mt-6 flex gap-4">
        <Link
          href="/dashboard"
          className="text-sm text-neutral-600 underline hover:text-neutral-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
