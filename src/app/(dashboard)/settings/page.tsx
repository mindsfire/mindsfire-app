export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xs font-medium">Profile</h2>
          </div>
          <a href="/help/settings/profile" className="text-sm text-muted-foreground hover:underline">Learn more</a>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">Profile</div>
              <div className="text-xs text-muted-foreground">+919035231806</div>
            </div>
            <button
              type="button"
              className="h-7 px-3 rounded-md text-xs bg-[#f0f8ff] text-[var(--foreground)] border border-border hover:bg-[#E9F3FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] cursor-pointer"
            >
              Edit
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
