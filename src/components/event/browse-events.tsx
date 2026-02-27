"use client";

import { useState, useTransition, useMemo } from "react";
import { getEventsPage, type EventsPageResult } from "@/lib/actions/event.actions";
import type { EventStatus } from "@/lib/firebase/types";
import type { EventListItem } from "@/components/event/event-card";
import { EventCard } from "@/components/event/event-card";
import { EventCardSkeleton } from "@/components/event/event-list-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATUS_OPTIONS: { value: "all" | EventStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "cancelled", label: "Cancelled" },
];

export interface BrowseEventsProps {
  initialEvents: EventListItem[];
  initialNextCursor: { createdAt: string; id: string } | null;
}

/**
 * Browse events: list + status filter + search (client-side) + load more.
 * Skeleton on initial load and while loading more.
 */
export function BrowseEvents({
  initialEvents,
  initialNextCursor,
}: BrowseEventsProps) {
  const [events, setEvents] = useState<EventListItem[]>(initialEvents);
  const [nextCursor, setNextCursor] = useState<{ createdAt: string; id: string } | null>(initialNextCursor);
  const [statusFilter, setStatusFilter] = useState<"all" | EventStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingMore, startLoadMore] = useTransition();

  const filtered = useMemo(() => {
    let list = events;
    if (statusFilter !== "all") {
      list = list.filter((e) => e.status === statusFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          e.location.toLowerCase().includes(q),
      );
    }
    return list;
  }, [events, statusFilter, searchQuery]);

  function handleLoadMore() {
    if (!nextCursor || isLoadingMore) return;
    startLoadMore(() => {
      getEventsPage({ cursor: nextCursor }).then((result: EventsPageResult) => {
        setEvents((prev) => [...prev, ...result.events]);
        setNextCursor(result.nextCursor);
      });
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="browse-status" className="sr-only">
            Filter by status
          </label>
          <select
            id="browse-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | EventStatus)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-0"
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor="browse-search" className="sr-only">
            Search events
          </label>
          <Input
            id="browse-search"
            type="search"
            placeholder="Search title, description, location"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
            autoComplete="off"
            aria-label="Search events"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 py-12 text-center text-neutral-600">
          {events.length === 0
            ? "No events yet. Create one to get started."
            : "No events match your filters or search."}
        </p>
      ) : (
        <ul className="space-y-4" aria-busy={isLoadingMore} aria-live="polite">
          {filtered.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>
      )}

      {nextCursor && filtered.length > 0 && (
        <div className="flex flex-col items-center gap-4 pt-4">
          {isLoadingMore && (
            <ul className="w-full space-y-4" aria-hidden>
              <li><EventCardSkeleton /></li>
              <li><EventCardSkeleton /></li>
            </ul>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            isLoading={isLoadingMore}
            loadingLabel="Loading more events"
            aria-label="Load more events"
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
