import Link from "next/link";
import { getMyRsvps } from "@/lib/actions/rsvp.actions";
import type { Rsvp } from "@/lib/types";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function RsvpCard({ rsvp }: { rsvp: Rsvp }) {
  const isCancelled = !!rsvp.cancelledAt;
  const title = rsvp.eventSnapshot?.title ?? "Event";
  const startsAt = rsvp.eventSnapshot?.startsAt;
  const location = rsvp.eventSnapshot?.location;

  return (
    <div
      className={`bg-white rounded-lg border border-neutral-200 p-6 shadow-sm${
        isCancelled ? " opacity-75" : ""
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <h4 className="font-semibold text-neutral-900">{title}</h4>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
            isCancelled
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {isCancelled ? "Cancelled" : "Confirmed"}
        </span>
      </div>
      <div className="text-sm text-neutral-600 space-y-1">
        {startsAt && <p><strong>Date:</strong> {formatDate(startsAt)}</p>}
        {location && <p><strong>Location:</strong> {location}</p>}
        <p><strong>RSVP Date:</strong> {formatDate(rsvp.createdAt)}</p>
        {isCancelled && rsvp.cancelledAt && (
          <p><strong>Cancelled:</strong> {formatDate(rsvp.cancelledAt)}</p>
        )}
      </div>
    </div>
  );
}

export default async function MyRsvpsPage() {
  const result = await getMyRsvps();

  if (!result.ok) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <p className="text-red-600">Failed to load RSVPs: {result.error}</p>
      </div>
    );
  }

  const { rsvps } = result.data;
  const confirmedRsvps = rsvps.filter((r) => !r.cancelledAt);
  const cancelledRsvps = rsvps.filter((r) => !!r.cancelledAt);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">My RSVPs</h1>
        <p className="text-lg text-neutral-600">
          Track your event registrations and attendance.
        </p>
      </div>

      <h2 className="sr-only">Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Total RSVPs</h3>
          <p className="text-3xl font-bold text-blue-600">{rsvps.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Confirmed</h3>
          <p className="text-3xl font-bold text-green-600">{confirmedRsvps.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Cancelled</h3>
          <p className="text-3xl font-bold text-red-600">{cancelledRsvps.length}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-neutral-900">Your RSVPs</h2>
        <Link
          href="/events"
          className="rounded bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
        >
          Browse More Events
        </Link>
      </div>

      {rsvps.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">No RSVPs yet</h3>
          <p className="text-neutral-600 mb-6">
            You haven&apos;t registered for any events yet.
          </p>
          <Link
            href="/events"
            className="rounded bg-neutral-900 px-6 py-3 text-white hover:bg-neutral-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {confirmedRsvps.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Confirmed RSVPs</h3>
              <div className="space-y-4">
                {confirmedRsvps.map((rsvp) => (
                  <RsvpCard key={rsvp.id} rsvp={rsvp} />
                ))}
              </div>
            </div>
          )}
          {cancelledRsvps.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Cancelled RSVPs</h3>
              <div className="space-y-4">
                {cancelledRsvps.map((rsvp) => (
                  <RsvpCard key={rsvp.id} rsvp={rsvp} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
