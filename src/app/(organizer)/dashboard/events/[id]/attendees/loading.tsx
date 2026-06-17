export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto p-6 animate-pulse">
      <div className="h-4 w-32 bg-neutral-200 rounded mb-4" />
      <div className="h-8 w-56 bg-neutral-200 rounded mb-2" />
      <div className="h-4 w-40 bg-neutral-200 rounded mb-8" />
      <div className="rounded-lg border border-neutral-200 overflow-hidden">
        <div className="h-12 bg-neutral-100 border-b border-neutral-200" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-neutral-100 last:border-0">
            <div className="h-4 w-8 bg-neutral-200 rounded" />
            <div className="h-4 w-40 bg-neutral-200 rounded" />
            <div className="h-4 w-32 bg-neutral-200 rounded" />
            <div className="h-4 w-24 bg-neutral-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
