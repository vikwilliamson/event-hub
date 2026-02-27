import { cn } from "@/lib/utils/cn";

const CARD_CLASS =
  "rounded-lg border border-neutral-200 bg-white p-4 shadow-sm";

/**
 * Skeleton for one event card in the list. Respects prefers-reduced-motion.
 */
export function EventCardSkeleton() {
  return (
    <div
      className={cn(CARD_CLASS, "animate-pulse")}
      aria-hidden
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-5 w-3/4 rounded bg-neutral-200" />
          <div className="h-4 w-1/2 rounded bg-neutral-100" />
          <div className="h-4 w-1/3 rounded bg-neutral-100" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-14 rounded-full bg-neutral-200" />
          <div className="h-4 w-12 rounded bg-neutral-100" />
        </div>
      </div>
      <div className="mt-3 h-4 w-full rounded bg-neutral-100" />
      <div className="mt-2 h-4 w-2/3 rounded bg-neutral-100" />
    </div>
  );
}

export interface EventListSkeletonProps {
  count?: number;
}

/**
 * List of skeleton cards for loading state. Use with aria-busy on container.
 */
export function EventListSkeleton({ count = 5 }: EventListSkeletonProps) {
  return (
    <ul className="space-y-4" aria-label="Loading events">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <EventCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
