import { currentUser } from "@clerk/nextjs/server";
import { ClientNavList, type NavItem } from "./ClientNavList";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function Divider() {
  return <div className="mx-2 h-px bg-border" />;
}

type PrivateMeta = { role?: string };

export default async function ServerSidebar() {
  const u = await currentUser();
  if (!u) return null;

  // Derive display info from Clerk
  const first = (u.firstName ?? "").trim();
  const last = (u.lastName ?? "").trim();
  const email = u.emailAddresses?.[0]?.emailAddress ?? "";
  const displayName = (first || last) ? `${first}${last ? " " + last : ""}` : (email.split("@")[0] || "Account");

  const pm = (u.privateMetadata ?? {}) as PrivateMeta;
  const role = String(pm.role ?? "customer").toLowerCase();

  let plan = "No plan";
  try {
    const db = getSupabaseAdmin();
    const { data: profile } = await db
      .from("profiles")
      .select("id")
      .eq("clerk_id", u.id)
      .limit(1)
      .maybeSingle();
    if (profile?.id) {
      const { data: activePlanRow } = await db
        .from("customer_plans")
        .select("plan_id, started_at")
        .eq("customer_id", profile.id)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (activePlanRow?.plan_id) {
        const { data: planRow } = await db
          .from("plans")
          .select("name")
          .eq("id", activePlanRow.plan_id)
          .limit(1)
          .maybeSingle();
        if (planRow?.name) plan = planRow.name;
      }
    }
  } catch {}

  const base: NavItem[] = [
    { href: "/overview", label: "Overview", iconKey: "gauge" },
    { href: "/settings", label: "Settings", iconKey: "settings" },
  ];

  const customer: NavItem[] = [
    { href: "/myassistant", label: "My Assistant", iconKey: "user" },
    { href: "/tasks", label: "Tasks", iconKey: "tasks" },
    { href: "/usage", label: "Usage", iconKey: "bar-chart" },
    { href: "/billing", label: "Billing & Invoices", iconKey: "receipt" },
    { href: "/contact", label: "Contact Us", iconKey: "message" },
    { href: "/referrals", label: "Referrals", iconKey: "gift" },
  ];

  const admin: NavItem[] = [
    { href: "/integrations", label: "Integrations", iconKey: "puzzle" },
    { href: "/users", label: "Users", iconKey: "users" },
  ];

  return (
    <aside className="sticky top-0 h-[calc(100dvh-120px)] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
      <div className="pl-2 px-0 py-4 space-y-1 h-[64px]">
        <div className="text-sm font-semibold leading-tight truncate">{displayName}</div>
        <div className="text-xs text-muted-foreground leading-tight">{plan}</div>
      </div>

      <nav className="px-0 pb-4">
        {role === "admin" ? (
          <ClientNavList items={[...base, ...admin]} />
        ) : (
          <div className="space-y-2">
            <ClientNavList items={base} />
            <Divider />
            <ClientNavList items={customer.slice(0, 3)} />
            <Divider />
            <ClientNavList items={customer.slice(3)} />
          </div>
        )}
      </nav>
    </aside>
  );
}
