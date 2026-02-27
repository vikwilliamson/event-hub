import Link from "next/link";
import { signOut } from "@/lib/actions/auth.actions";

/**
 * Organizer dashboard nav: Dashboard + Sign out. Used in (organizer) layout.
 * Sign out is a form so it works without JS (progressive enhancement).
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
              <SignOutButton />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

function SignOutButton() {
  return (
    <form action={signOut} className="inline">
      <button
        type="submit"
        className="text-neutral-700 hover:text-neutral-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded"
      >
        Sign out
      </button>
    </form>
  );
}
