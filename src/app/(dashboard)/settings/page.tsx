import { Suspense } from "react";
import ProfileCardServer from "./ProfileCardServer";
import ActiveSessionsCardServer from "./ActiveSessionsCardServer";
import ProfileCardSkeleton from "./ProfileCardSkeleton";
import ActiveSessionsCardSkeleton from "./ActiveSessionsCardSkeleton";

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
        <Suspense fallback={<ProfileCardSkeleton />}>
          <ProfileCardServer />
        </Suspense>
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xs font-medium">Active Sessions</h2>
          </div>
        </div>
        <Suspense fallback={<ActiveSessionsCardSkeleton />}>
          <ActiveSessionsCardServer />
        </Suspense>
      </section>
    </div>
  )
}
