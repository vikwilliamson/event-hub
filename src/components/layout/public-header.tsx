import Link from "next/link";

/**
 * Public header: logo + nav. Used on public and auth layouts.
 */
export function PublicHeader() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-lg font-semibold text-neutral-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded"
        >
          EventHub
        </Link>
        <AppNav />
      </div>
    </header>
  );
}

function AppNav() {
  return (
    <nav aria-label="Main">
      <ul className="flex items-center gap-6">
        <li>
          <Link
            href="/login"
            className="text-neutral-700 hover:text-neutral-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded"
          >
            Log in
          </Link>
        </li>
        <li>
          <Link
            href="/register"
            className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            Sign up
          </Link>
        </li>
      </ul>
    </nav>
  );
}
