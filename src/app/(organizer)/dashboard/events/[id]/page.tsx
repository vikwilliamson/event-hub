import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/firebase/auth.server";
import { getEvent } from "@/lib/firebase/db";
import { cancelEvent, toggleEventStatus } from "@/lib/actions/event.actions";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

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

  async function handleToggleStatus() {
    "use server";
    await toggleEventStatus(id);
  }

  async function handleCancel() {
    "use server";
    const result = await cancelEvent(id);
    if (result.ok) {
      revalidatePath(`/dashboard/events/${id}`);
    }
  }

  const isCancelled = event.status === "cancelled";

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-neutral-600 underline hover:text-neutral-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded"
        >
          ← Back to dashboard
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold text-neutral-900">{event.title}</h1>
        <span
          className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize ${
            event.status === "published"
              ? "bg-green-100 text-green-800"
              : event.status === "cancelled"
              ? "bg-red-100 text-red-800"
              : "bg-neutral-100 text-neutral-700"
          }`}
        >
          {event.status}
        </span>
      </div>

      <p className="text-sm text-neutral-500 mb-2">
        {event.rsvpCount} RSVP{event.rsvpCount !== 1 ? "s" : ""}
        {event.capacity ? ` / ${event.capacity} capacity` : ""}
      </p>

      <p className="text-neutral-700 mb-2">{event.description}</p>
      <p className="text-neutral-600 text-sm">
        {event.location} · {event.startsAt.toLocaleString()}
      </p>
      {event.cancelledAt && (
        <p className="text-sm text-red-600 mt-1">
          Cancelled {event.cancelledAt.toLocaleDateString()}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {!isCancelled && (
          <>
            <Link
              href={`/dashboard/events/${id}/edit`}
              className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium rounded-md border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
            >
              Edit event
            </Link>

            <form action={handleToggleStatus}>
              <Button type="submit" variant="secondary">
                {event.status === "published" ? "Unpublish" : "Publish"}
              </Button>
            </form>

            <form
              action={handleCancel}
              onSubmit={(e) => {
                if (!confirm("Cancel this event? This cannot be undone.")) {
                  e.preventDefault();
                }
              }}
            >
              <Button type="submit" variant="danger">
                Cancel event
              </Button>
            </form>
          </>
        )}

        <Link
          href={`/dashboard/events/${id}/attendees`}
          className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium rounded-md text-neutral-700 hover:bg-neutral-100 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
        >
          View attendees ({event.rsvpCount})
        </Link>
      </div>
    </div>
  );
}
