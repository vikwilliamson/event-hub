import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/firebase/auth.server";
import { EventForm } from "@/components/event/event-form";

/**
 * Create event page. Organizer-only; session required (middleware + server guard).
 */
export default async function NewEventPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Create event</h1>
      <p className="mt-2 text-neutral-600">
        Add title, date, location, and description. Save as draft or publish.
      </p>

      <div className="mt-6 max-w-2xl">
        <EventForm />
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
