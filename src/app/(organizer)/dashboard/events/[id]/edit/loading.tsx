export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto p-6 animate-pulse">
      <div className="h-4 w-32 bg-neutral-200 rounded mb-4" />
      <div className="h-8 w-48 bg-neutral-200 rounded mb-8" />
      <div className="space-y-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 bg-neutral-200 rounded" />
            <div className="h-10 bg-neutral-200 rounded" />
          </div>
        ))}
        <div className="h-10 w-32 bg-neutral-200 rounded" />
      </div>
    </div>
  );
}
