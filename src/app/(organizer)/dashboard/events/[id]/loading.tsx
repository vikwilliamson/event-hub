export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto p-6 animate-pulse">
      <div className="mb-6">
        <div className="h-4 w-32 bg-neutral-200 rounded mb-4" />
        <div className="h-8 w-80 bg-neutral-200 rounded mb-2" />
        <div className="h-5 w-24 bg-neutral-200 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-20 bg-neutral-200 rounded" />
            <div className="h-5 w-48 bg-neutral-200 rounded" />
          </div>
        ))}
      </div>
      <div className="h-24 bg-neutral-200 rounded-lg mb-8" />
      <div className="flex gap-3">
        <div className="h-9 w-28 bg-neutral-200 rounded" />
        <div className="h-9 w-28 bg-neutral-200 rounded" />
        <div className="h-9 w-28 bg-neutral-200 rounded" />
      </div>
    </div>
  );
}
