export function BikeCardSkeleton() {
  return (
    <div className="glass-panel p-2.5 sm:p-3" aria-hidden="true">
      <div className="skeleton aspect-[4/3]" />
      <div className="flex items-start justify-between gap-3 py-4">
        <div className="flex-1 space-y-2.5">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-2/3" />
          <div className="skeleton mt-3 h-2.5 w-20" />
        </div>
        <div className="skeleton h-9 w-9 shrink-0" />
      </div>
    </div>
  );
}

export function PartCardSkeleton() {
  return (
    <div className="border-t border-black/15 pt-2.5 dark:border-white/15" aria-hidden="true">
      <div className="skeleton aspect-square" />
      <div className="space-y-2 pt-2.5">
        <div className="skeleton h-2.5 w-16" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-2.5 w-12" />
      </div>
    </div>
  );
}
