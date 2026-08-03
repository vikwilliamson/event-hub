import Link from "next/link";

/**
 * Organizer dashboard nav. No sign-out — the demo identity is a browser
 * cookie, not an account.
 */
export function OrganizerTopbar() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/dashboard"
          className="text-lg font-semibold text-neutral-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded"
        >
          EventHub
        </Link>
        <nav aria-label="Dashboard">
          <ul className="flex items-center gap-6">
            <li>
              <Link
                href="/dashboard"
                className="text-neutral-700 hover:text-neutral-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded"
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/events"
                className="text-neutral-700 hover:text-neutral-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded"
              >
                Browse Events
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
