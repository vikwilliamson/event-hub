export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto p-6 animate-pulse">
      <div className="h-8 w-40 bg-neutral-200 rounded mb-2" />
      <div className="h-4 w-64 bg-neutral-200 rounded mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 bg-neutral-200 rounded-lg" />
        ))}
      </div>
      <div className="h-6 w-32 bg-neutral-200 rounded mb-4" />
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 bg-neutral-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
