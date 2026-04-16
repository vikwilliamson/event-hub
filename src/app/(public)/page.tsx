import Link from "next/link";

export default function HomePage() {
  return (
    <div className="py-12">
      <h1 className="text-3xl font-bold text-neutral-900">EventHub</h1>
      <p className="mt-2 text-neutral-600">
        Create events and collect RSVPs. No authentication required.
      </p>
      
      <div className="mt-8 flex gap-4">
        <Link
          href="/events"
          className="inline-flex items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
        >
          Browse Events
        </Link>
        <Link
          href="/organizer/dashboard"
          className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
