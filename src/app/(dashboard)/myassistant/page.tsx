export default function MyAssistantPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My Assistant</h1>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xs font-medium">Assistant</h2>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Your personal assistant features will appear here.</div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xs font-medium">Shortcuts</h2>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Quick actions and tools, coming soon.</div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xs font-medium">Requests</h2>
          </div>
          <a href="/requests" className="text-sm text-muted-foreground hover:underline">View all</a>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Access your Requests here. <a href="/requests" className="underline hover:no-underline">Go to Requests</a>.</div>
        </div>
      </section>
    </div>
  );
}
