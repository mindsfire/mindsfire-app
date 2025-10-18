export default function Page() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold">Contact Us</h1>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xs font-medium">Support</h2>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Reach us via email or chat. Typical response time: under 24 hours.</div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xs font-medium">Send a Message</h2>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Start a new conversation with our team (coming soon).</div>
        </div>
      </section>
    </div>
  );
}
