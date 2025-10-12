import { Suspense } from "react";
import PlansSection from "./PlansSection";

function PlansSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0,1,2].map((i) => (
        <div key={i} className="rounded-xl border border-border p-4">
          <div className="h-4 w-24 bg-muted animate-pulse rounded mb-3" />
          <div className="h-6 w-32 bg-muted animate-pulse rounded mb-4" />
          <div className="h-20 w-full bg-muted animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<PlansSkeleton />}> 
        <PlansSection />
      </Suspense>
      {/** Add more sections below similarly with their own Suspense boundaries */}
    </div>
  );
}
