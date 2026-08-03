import Link from "next/link";

export default function HomePage() {
  return (
    <div className="py-16 max-w-4xl mx-auto px-4">
      {/* Hero */}
      <section className="text-center mb-16">
        <h1 className="text-5xl font-bold text-neutral-900 mb-4">
          Host events. Collect RSVPs.
          <br />
          <span className="text-neutral-500">That&apos;s it.</span>
        </h1>
        <p className="text-xl text-neutral-600 max-w-2xl mx-auto mb-8">
          EventHub makes it easy to create an event page, share a link, and see who&apos;s coming —
          all in under a minute.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard/events/new"
            className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-6 py-3 text-base font-medium text-white hover:bg-neutral-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            Create your first event
          </Link>
          <Link
            href="/events"
            className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-6 py-3 text-base font-medium text-neutral-900 hover:bg-neutral-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
          >
            Browse events
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="mb-16" aria-labelledby="how-it-works-heading">
        <h2
          id="how-it-works-heading"
          className="text-2xl font-semibold text-neutral-900 text-center mb-10"
        >
          How it works
        </h2>
        <ol className="grid gap-8 sm:grid-cols-3" role="list">
          <li className="flex flex-col items-center text-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white text-lg font-bold"
              aria-hidden="true"
            >
              1
            </span>
            <h3 className="font-semibold text-neutral-900">Create an event</h3>
            <p className="text-neutral-600 text-sm">
              Fill in your event details — title, date, location, and optional
              capacity. No sign-up needed.
            </p>
          </li>
          <li className="flex flex-col items-center text-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white text-lg font-bold"
              aria-hidden="true"
            >
              2
            </span>
            <h3 className="font-semibold text-neutral-900">Share your link</h3>
            <p className="text-neutral-600 text-sm">
              Publish your event and share the URL. Attendees sign in once and RSVP with a
              single click.
            </p>
          </li>
          <li className="flex flex-col items-center text-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white text-lg font-bold"
              aria-hidden="true"
            >
              3
            </span>
            <h3 className="font-semibold text-neutral-900">See who&apos;s coming</h3>
            <p className="text-neutral-600 text-sm">
              Your organizer dashboard shows a live attendee list and RSVP count as responses
              come in.
            </p>
          </li>
        </ol>
      </section>

      {/* Attendee CTA */}
      <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center">
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">
          Looking for an event?
        </h2>
        <p className="text-neutral-600 mb-6">
          Browse upcoming events and RSVP in one click. You&apos;ll need a free account to save
          your spot.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/events"
            className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            Browse events
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
          >
            Sign in to RSVP
          </Link>
        </div>
      </section>
    </div>
  );
}
