import Link from "next/link";
import { CITIES } from "@/lib/cities";
import { EVENT_CATEGORIES } from "@/lib/types";
import { DEFAULT_RADIUS_KM } from "@/lib/search";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const RADIUS_OPTIONS_KM = [10, 25, 50, 100, 250];

const selectClassName =
  "mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500";

interface EventSearchFormProps {
  /** Current URL params, used to keep inputs filled after submit. */
  defaults: { q?: string; category?: string; near?: string; radius?: string };
  hasActiveFilters: boolean;
}

/**
 * Server-rendered GET form: submitting updates the URL search params and the
 * page re-renders with filtered results. Works without client-side JS and
 * produces shareable URLs.
 */
export function EventSearchForm({ defaults, hasActiveFilters }: EventSearchFormProps) {
  return (
    <form
      method="GET"
      action="/events"
      role="search"
      aria-label="Search events"
      className="mb-8 rounded-lg border border-neutral-200 bg-neutral-50 p-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <label htmlFor="search-text" className="block text-sm font-medium text-neutral-700">
            Search
          </label>
          <Input
            id="search-text"
            type="search"
            name="q"
            placeholder="Title, venue, keyword…"
            className="mt-1"
            defaultValue={defaults.q ?? ""}
          />
        </div>

        <div>
          <label htmlFor="search-category" className="block text-sm font-medium text-neutral-700">
            Category
          </label>
          <select
            id="search-category"
            name="category"
            className={selectClassName}
            defaultValue={defaults.category ?? ""}
          >
            <option value="">All categories</option>
            {EVENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="search-near" className="block text-sm font-medium text-neutral-700">
            Near
          </label>
          <select
            id="search-near"
            name="near"
            className={selectClassName}
            defaultValue={defaults.near ?? ""}
          >
            <option value="">Anywhere</option>
            {CITIES.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="search-radius" className="block text-sm font-medium text-neutral-700">
            Within
          </label>
          <select
            id="search-radius"
            name="radius"
            className={selectClassName}
            defaultValue={defaults.radius ?? String(DEFAULT_RADIUS_KM)}
          >
            {RADIUS_OPTIONS_KM.map((km) => (
              <option key={km} value={km}>
                {km} km
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" size="sm">
          Search
        </Button>
        {hasActiveFilters && (
          <Link
            href="/events"
            className="text-sm font-medium text-neutral-600 hover:text-neutral-900 focus:outline-none focus:underline"
          >
            Clear filters
          </Link>
        )}
      </div>
    </form>
  );
}
