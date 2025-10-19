import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { clerkClient } from "@clerk/nextjs/server";

export default function MyAssistantPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My Assistant</h1>
      <AssistantsSection />
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

async function AssistantsSection() {
  const { userId } = await auth();
  const db = getSupabaseAdmin();
  const { data: me } = await db
    .from("profiles")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const { data: assign } = await db
    .from("va_assignments")
    .select("primary_va_profile_id, secondary_va_profile_id, notes")
    .eq("customer_profile_id", me?.id ?? null)
    .eq("active", true)
    .maybeSingle();

  const ids = [assign?.primary_va_profile_id, assign?.secondary_va_profile_id].filter(Boolean) as string[];
  const { data: vas } = ids.length
    ? await db
        .from("profiles")
        .select("id, clerk_id, email, phone_e164, country_code, region")
        .in("id", ids)
    : { data: [] as any };

  const primary = vas?.find((v: any) => v.id === assign?.primary_va_profile_id);
  const secondary = vas?.find((v: any) => v.id === assign?.secondary_va_profile_id);
  // Resolve names from Clerk (server-side); fallback to email prefix
  let primaryLabel = primary?.email ? String(primary.email).split("@")[0] : "Primary";
  let secondaryLabel = secondary?.email ? String(secondary.email).split("@")[0] : "Secondary";
  try {
    const client = await clerkClient();
    if (primary?.clerk_id) {
      const u = await client.users.getUser(primary.clerk_id as string);
      primaryLabel = (u?.fullName as string) || primaryLabel;
    }
    if (secondary?.clerk_id) {
      const u = await client.users.getUser(secondary.clerk_id as string);
      secondaryLabel = (u?.fullName as string) || secondaryLabel;
    }
  } catch {}

  return (
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
            <div>Timezone</div>
            <div>Status</div>
          </div>

          {primary ? (
            <div className="grid grid-cols-4 px-3 py-2">
              <div className="inline-flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis">
                <span className="truncate max-w-[10rem]">{primaryLabel}</span>
                <span className="inline-flex items-center rounded-sm bg-accent/30 px-1 py-0 text-[9px] font-medium leading-4 text-accent-foreground shrink-0">Primary</span>
              </div>
              <div className="whitespace-nowrap overflow-hidden text-ellipsis">{primary.email}</div>
              <div className="whitespace-nowrap overflow-hidden text-ellipsis">{primary.country_code ?? "—"} {primary.region ?? ""}</div>
              <div className="whitespace-nowrap">Assigned</div>
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">No assistant assigned yet.</div>
          )}

          {secondary && (
            <div className="grid grid-cols-4 px-3 py-2">
              <div className="inline-flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis">
                <span className="truncate max-w-[10rem]">{secondaryLabel}</span>
                <span className="inline-flex items-center rounded-sm bg-accent/30 px-1 py-0 text-[9px] font-medium leading-4 text-accent-foreground shrink-0">Secondary</span>
              </div>
              <div className="whitespace-nowrap overflow-hidden text-ellipsis">{secondary.email}</div>
              <div className="whitespace-nowrap overflow-hidden text-ellipsis">{secondary.country_code ?? "—"} {secondary.region ?? ""}</div>
              <div className="whitespace-nowrap">Assigned</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
