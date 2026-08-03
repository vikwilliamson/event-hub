import { notFound } from "next/navigation";
import Link from "next/link";
import { getDemoSession } from "@/lib/session";
import { getEventAttendees } from "@/lib/actions/rsvp.actions";
import { AttendeeTable } from "@/components/attendee/attendee-table";

type Props = { params: Promise<{ id: string }> };

export default async function AttendeesPage({ params }: Props) {
  const session = await getDemoSession();
  if (!session) notFound();

  const { id } = await params;
  const result = await getEventAttendees(id);

  if (!result.ok) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-4">Attendees</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-700">{result.error}</p>
        </div>
        <Link
          href={`/dashboard/events/${id}`}
          className="mt-4 inline-block text-sm text-neutral-600 underline hover:text-neutral-900"
        >
          Back to event
        </Link>
      </div>
    );
  }

  const { attendees, eventTitle } = result.data;

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/dashboard/events/${id}`}
          className="text-sm text-neutral-600 underline hover:text-neutral-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded"
        >
          ← Back to event
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 mt-2">
          Attendees — {eventTitle}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          {attendees.length} confirmed attendee{attendees.length !== 1 ? "s" : ""}
        </p>
      </div>
      <AttendeeTable attendees={attendees} />
    </div>
  );
}
