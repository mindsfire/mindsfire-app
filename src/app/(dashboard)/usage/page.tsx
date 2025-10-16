export default function Page() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold">Usage</h1>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xs font-medium">Usage Summary</h2>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Your current period usage will appear here.</div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xs font-medium">Quota & Limits</h2>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Plan limits and remaining quota (coming soon).</div>
        </div>
      </section>
    </div>
  );
}
