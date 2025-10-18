export default function ActiveSessionsCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div>
        {[0, 1, 2].map((i) => (
          <div key={i}>
            {i !== 0 && (
              <div className="mx-2 h-px bg-muted-foreground/8 dark:bg-muted-foreground/12" />
            )}
            <div className="flex items-start justify-between py-3">
              <div className="flex items-center gap-2 w-full">
                <span className="w-5 flex justify-center text-muted-foreground">
                  <span className="h-4 w-4 rounded-sm bg-muted animate-pulse" />
                </span>
                <div className="flex-1">
                  <div className="h-3 w-40 rounded bg-muted animate-pulse" />
                  <div className="mt-2 h-2 w-28 rounded bg-muted animate-pulse" />
                </div>
              </div>
              <span className="h-7 w-16 rounded-md bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
