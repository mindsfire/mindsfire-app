export default function ProfileCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <div className="h-3.5 w-12 bg-muted animate-pulse rounded" />
          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
          <div className="pt-3">
            <div className="h-3.5 w-14 bg-muted animate-pulse rounded mb-1" />
            <div className="h-3 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <span className="h-7 w-12 rounded-md bg-muted animate-pulse" />
      </div>
    </div>
  );
}
