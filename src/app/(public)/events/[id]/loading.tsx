export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-pulse">
      <div className="h-9 w-3/4 bg-neutral-200 rounded mb-4" />
      <div className="h-4 w-1/3 bg-neutral-200 rounded mb-2" />
      <div className="h-4 w-1/2 bg-neutral-200 rounded mb-8" />
      <div className="space-y-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-4 bg-neutral-200 rounded" />
        ))}
      </div>
      <div className="h-10 w-32 bg-neutral-200 rounded" />
    </div>
  );
}
