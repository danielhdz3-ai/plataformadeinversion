export function OpportunityFeedSkeleton({ count = 15 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-sm"
          style={{ animationDelay: `${(i % 5) * 80}ms` }}
        >
          <div className="aspect-[4/3] animate-pulse bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-100" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-[92%] animate-pulse rounded bg-neutral-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-100" />
            <div className="h-7 w-2/5 animate-pulse rounded bg-neutral-100" />
            <div className="h-10 animate-pulse rounded-lg bg-neutral-50" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-9 animate-pulse rounded-lg bg-neutral-100" />
              <div className="h-9 animate-pulse rounded-lg bg-neutral-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
