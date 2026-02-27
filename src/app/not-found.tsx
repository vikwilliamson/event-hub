import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold text-neutral-900">Page not found</h1>
      <p className="mt-2 text-neutral-600">The page you’re looking for doesn’t exist.</p>
      <Link
        href="/"
        className="mt-6 rounded bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
      >
        Go home
      </Link>
    </div>
  );
}
