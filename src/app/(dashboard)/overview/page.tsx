export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground mb-1">Plan</div>
          <div className="text-lg font-medium">Free</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground mb-1">Usage</div>
          <div className="text-lg font-medium">—</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground mb-1">Integrations</div>
          <div className="text-lg font-medium">GitHub · Slack · Linear</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="text-sm text-muted-foreground mb-2">Invite Team Members</div>
        <div className="text-sm text-muted-foreground">Add your team to collaborate and manage requests.</div>
      </div>

      <div className="space-y-2">
        <div className="rounded-xl border border-border bg-card p-0">
          <div className="divide-y">
            {[
              { name: "GitHub", desc: "Connect GitHub for background agents and enhanced context" },
              { name: "Slack", desc: "Work with background agents from Slack" },
              { name: "Linear", desc: "Connect Linear workspace to delegate issues" },
            ].map((i) => (
              <div key={i.name} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{i.name}</div>
                  <div className="text-sm text-muted-foreground">{i.desc}</div>
                </div>
                <button className="h-8 px-3 rounded-md border border-border text-sm hover:bg-accent hover:text-accent-foreground">Connect</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
