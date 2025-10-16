export default function Page() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold">Billing & Invoices</h1>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xs font-medium">Invoices</h2>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Your recent invoices will appear here.</div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xs font-medium">Payment Method</h2>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Add or update your payment method (coming soon).</div>
        </div>
      </section>
    </div>
  );
}
