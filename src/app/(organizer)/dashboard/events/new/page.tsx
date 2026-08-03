import Link from "next/link";
import { env } from "@/lib/env";
import { EventForm } from "@/components/event/event-form";

/**
 * Create event page. Every visitor has a demo identity, so anyone can
 * organize events — no session guard needed.
 */
export default function NewEventPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Create event</h1>
      <p className="mt-2 text-neutral-600">
        Add title, date, location, and description. Save as draft or publish.
      </p>

      <div className="mt-6 max-w-2xl">
        <EventForm aiEnabled={Boolean(env.ANTHROPIC_API_KEY)} />
      </div>

      <p className="mt-6">
        <Link
          href="/dashboard"
          className="text-sm text-neutral-600 underline hover:text-neutral-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded"
        >
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
