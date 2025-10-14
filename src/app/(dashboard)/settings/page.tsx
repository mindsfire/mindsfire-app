export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground mb-1">Profile</div>
          <div className="text-sm text-muted-foreground">Name, email, avatar</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground mb-1">Security</div>
          <div className="text-sm text-muted-foreground">Password, 2FA</div>
        </div>
      </div>
    </div>
  )
}
