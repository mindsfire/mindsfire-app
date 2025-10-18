export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Integrations</h1>
      <div className="rounded-xl border border-border bg-card p-0">
        <div className="divide-y">
          {[
            { name: "GitHub", desc: "Connect GitHub for Background Agents and enhanced context" },
            { name: "Slack", desc: "Work with Background Agents from Slack" },
            { name: "Linear", desc: "Delegate issues to Background Agents" },
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
  )
}
