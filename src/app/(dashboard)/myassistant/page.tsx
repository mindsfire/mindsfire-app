export default function MyAssistantPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My Assistant</h1>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xs font-medium">Assistants</h2>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm">
            <div className="grid grid-cols-4 px-3 pb-2 text-xs font-medium text-foreground/80">
              <div>Name</div>
              <div>Email</div>
              <div>Team</div>
              <div>Timezone</div>
            </div>

            <div className="grid grid-cols-4 px-3 py-2">
              <div className="inline-flex items-center gap-2">
                <span>Aisha Khan</span>
                <span className="inline-flex items-center rounded-sm bg-accent/30 px-1 py-0 text-[9px] font-medium leading-4 text-accent-foreground">Primary</span>
              </div>
              <div>aisha@example.com</div>
              <div>Customer Success</div>
              <div>IST (UTC+5:30)</div>
            </div>

            <div className="grid grid-cols-4 px-3 py-2">
              <div className="inline-flex items-center gap-2">
                <span>Rahul Verma</span>
                <span className="inline-flex items-center rounded-sm bg-accent/30 px-1 py-0 text-[9px] font-medium leading-4 text-accent-foreground">Secondary</span>
              </div>
              <div>rahul@example.com</div>
              <div>Customer Success</div>
              <div>IST (UTC+5:30)</div>
            </div>

            <div className="my-2 h-px bg-border" />

            <div className="grid grid-cols-4 px-3 py-2">
              <div className="inline-flex items-center gap-2">
                <span>Priya Menon</span>
                <span className="inline-flex items-center rounded-sm bg-accent/30 px-1 py-0 text-[9px] font-medium leading-4 text-accent-foreground">Team Lead</span>
              </div>
              <div>priya@example.com</div>
              <div>Operations</div>
              <div>IST (UTC+5:30)</div>
            </div>
          </div>
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
