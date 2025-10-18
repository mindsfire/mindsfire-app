export default function Page() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold">Referrals</h1>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xs font-medium">Referral Link</h2>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Share your unique link with friends to earn rewards (coming soon).</div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xs font-medium">Rewards</h2>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Your referral rewards and credits will appear here.</div>
        </div>
      </section>
    </div>
  );
}
