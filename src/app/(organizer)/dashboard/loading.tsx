import { EventListSkeleton } from "@/components/event/event-list-skeleton";

export default function DashboardLoading() {
  return (
    <div>
      <div className="h-8 w-48 animate-pulse rounded bg-neutral-200" aria-hidden />
      <div className="mt-2 h-5 w-72 animate-pulse rounded bg-neutral-100" aria-hidden />
      <div className="mt-6 h-10 w-32 animate-pulse rounded bg-neutral-200" aria-hidden />
      <div className="mt-8">
        <EventListSkeleton count={5} />
      </div>
    </div>
  );
}
