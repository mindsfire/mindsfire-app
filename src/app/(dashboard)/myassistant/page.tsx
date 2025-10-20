import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import AssistantActions from "@/components/assistant/AssistantActions";

export default function MyAssistantPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My Assistant</h1>
      <Suspense fallback={<AssistantsSkeleton />}> 
        <AssistantsSection />
      </Suspense>
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
        <div className="flex items-baseline justify-start">
          <div>
            <h2 className="text-xs font-medium">Requests</h2>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Access your Requests here. <a href="/requests" className="underline hover:no-underline">Go to Requests</a>.</div>
        </div>
      </section>
    </div>
  );
}

async function AssistantsSection() {
  const { userId } = await auth();
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("get_customer_assignment", { p_clerk_id: userId });
  if (error) {
    return (
      <section className="space-y-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-destructive">Failed to load assistants.</div>
        </div>
      </section>
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  const primary = row && row.primary_va_id ? {
    email: row.primary_email as string | null,
    display_name: row.primary_display_name as string | null,
    name: row.primary_name as string | null,
    country_code: row.primary_country as string | null,
    region: row.primary_region as string | null,
  } : null;
  const secondary = row && row.secondary_va_id ? {
    email: row.secondary_email as string | null,
    display_name: row.secondary_display_name as string | null,
    name: row.secondary_name as string | null,
    country_code: row.secondary_country as string | null,
    region: row.secondary_region as string | null,
  } : null;
  const primaryLabel = (row?.primary_best_name as string | null) 
    || primary?.display_name 
    || primary?.name 
    || (primary?.email ? String(primary.email).split("@")[0] : "Primary");
  const secondaryLabel = (row?.secondary_best_name as string | null)
    || secondary?.display_name 
    || secondary?.name 
    || (secondary?.email ? String(secondary.email).split("@")[0] : "Secondary");

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-xs font-medium">Assistants</h2>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="text-sm">
          <div className="grid grid-cols-4 -px-3 pr-16 pb-2 text-xs font-medium text-foreground/80">
            <div>Name</div>
            <div>Email</div>
            <div>Timezone</div>
            <div className="ml-1">Status</div>
          </div>

          {primary ? (
            <div className="relative">
              <div className="grid grid-cols-4 -px-3 pr-16 py-2">
                <div className="inline-flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis">
                  <span className="truncate max-w-[10rem]">{primaryLabel}</span>
                  <span className="inline-flex items-center rounded-sm bg-accent/30 px-1 py-0 text-[9px] font-medium leading-4 text-accent-foreground shrink-0">Primary</span>
                </div>
                <div className="whitespace-nowrap overflow-hidden text-ellipsis">{primary.email}</div>
                <div className="whitespace-nowrap overflow-hidden text-ellipsis">{primary.country_code ?? "—"} {primary.region ?? ""}</div>
                <div className="whitespace-nowrap -ml-3"><span className="inline-flex h-7 items-center rounded-md border border-green-600 bg-[#f0f8ff] px-3 text-xs font-medium text-green-600">Assigned</span></div>
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <AssistantActions name={primaryLabel} email={primary?.email ?? undefined} phoneE164={null} />
              </div>
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">No assistant assigned yet.</div>
          )}

          {secondary && (
            <div className="relative">
              <div className="grid grid-cols-4 -px-3 pr-16 py-2">
                <div className="inline-flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis">
                  <span className="truncate max-w-[10rem]">{secondaryLabel}</span>
                  <span className="inline-flex items-center rounded-sm bg-accent/30 px-1 py-0 text-[9px] font-medium leading-4 text-accent-foreground shrink-0">Secondary</span>
                </div>
                <div className="whitespace-nowrap overflow-hidden text-ellipsis">{secondary.email}</div>
                <div className="whitespace-nowrap overflow-hidden text-ellipsis">{secondary.country_code ?? "—"} {secondary.region ?? ""}</div>
                <div className="whitespace-nowrap -ml-3"><span className="inline-flex h-7 items-center rounded-md border border-green-600 bg-[#f0f8ff] px-3 text-xs font-medium text-green-600">Assigned</span></div>
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <AssistantActions name={secondaryLabel} email={secondary?.email ?? undefined} phoneE164={null} />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AssistantsSkeleton() {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-xs font-medium">Assistants</h2>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="text-sm">
          <div className="grid grid-cols-4 -px-3 pr-16 pb-2 text-xs font-medium text-foreground/80">
            <div>Name</div>
            <div>Email</div>
            <div>Timezone</div>
            <div className="ml-1">Status</div>
          </div>
          <div className="grid grid-cols-4 -px-3 pr-16 py-2">
            <div className="inline-flex items-center gap-2">
              <span className="h-3 w-24 rounded bg-muted animate-pulse" />
              <span className="h-3 w-10 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-3 w-40 rounded bg-muted animate-pulse" />
            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            <div className="-ml-3">
              <span className="h-3 w-16 rounded bg-muted animate-pulse inline-block" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
