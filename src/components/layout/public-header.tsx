import Link from "next/link";
import { getDemoSession, displayNameForUid } from "@/lib/session";

/**
 * Public header: logo + nav + demo identity badge.
 * No sign-in — every visitor gets an automatic local identity.
 */
export async function PublicHeader() {
  const session = await getDemoSession();
  const displayName = session ? displayNameForUid(session.uid) : null;

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-lg font-semibold text-neutral-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded"
        >
          EventHub
        </Link>
        <nav aria-label="Main">
          <ul className="flex items-center gap-6">
            <li>
              <Link
                href="/events"
                className="text-neutral-700 hover:text-neutral-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded"
              >
                Browse Events
              </Link>
            </li>
            <li>
              <Link
                href="/my-rsvps"
                className="text-neutral-700 hover:text-neutral-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded"
              >
                My RSVPs
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard"
                className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              >
                Organizer Dashboard
              </Link>
            </li>
            {displayName && (
              <li>
                <span
                  className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700"
                  title="Your local demo identity"
                >
                  {displayName}
                </span>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
