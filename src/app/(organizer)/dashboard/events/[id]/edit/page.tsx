import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/firebase/auth.server";
import { getEvent } from "@/lib/firebase/db";
import { EditEventForm } from "@/components/event/edit-event-form";

type Props = { params: Promise<{ id: string }> };

function toInputDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toInputTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default async function EditEventPage({ params }: Props) {
  const session = await getSession();
  if (!session) notFound();

  const { id } = await params;
  const event = await getEvent(session.uid, id);
  if (!event) notFound();
  if (event.status === "cancelled") {
    return (
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-4">Edit Event</h1>
        <p className="text-neutral-600">Cancelled events cannot be edited.</p>
        <Link
          href={`/dashboard/events/${id}`}
          className="mt-4 inline-block text-sm text-neutral-600 underline hover:text-neutral-900"
        >
          Back to event
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/dashboard/events/${id}`}
          className="text-sm text-neutral-600 underline hover:text-neutral-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded"
        >
          ← Back to event
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 mt-2">Edit Event</h1>
      </div>
      <EditEventForm
        eventId={id}
        initialTitle={event.title}
        initialDescription={event.description}
        initialLocation={event.location}
        initialDate={toInputDate(event.startsAt)}
        initialTime={toInputTime(event.startsAt)}
        initialStatus={event.status as "draft" | "published"}
        initialCapacity={event.capacity ?? undefined}
      />
    </div>
  );
}
