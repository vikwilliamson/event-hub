import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
      <p className="mt-2 text-neutral-600">Your events and RSVP counts.</p>

      <p className="mt-6">
        <Link
          href="/dashboard/events/new"
          className="inline-flex items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
        >
          Create event
        </Link>
      </p>

      <p className="mt-4 text-sm text-neutral-500">(Event list stub: wire to getOrganizerEvents)</p>
    </div>
  );
}
