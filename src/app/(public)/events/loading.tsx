export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 animate-pulse">
      <div className="h-8 w-48 bg-neutral-200 rounded mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 bg-neutral-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
