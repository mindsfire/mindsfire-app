import { supabaseServer } from "@/lib/supabaseServer";
import { ClientNavList, type NavItem } from "./ClientNavList";

function Divider() {
  return <div className="mx-2 h-px bg-border" />;
}

export default async function ServerSidebar() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user?.id) return null;

  const { data: prof } = await supabase
    .from("profiles")
    .select("first_name, last_name, name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, plan:plan_id(name)")
    .eq("customer_id", user.id)
    .in("status", ["trialing", "active"]);

  const plan = (subs || [])
    .sort((a: any, b: any) => (new Date(b.current_period_end || 0).getTime() - new Date(a.current_period_end || 0).getTime()))[0]?.plan?.name || "No plan";

  const email = prof?.email || user.email || "";
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown> & { first_name?: string; last_name?: string; full_name?: string };
  const displayName = ([prof?.first_name, prof?.last_name].filter(Boolean).join(" "))
    || prof?.name
    || ([meta.first_name, meta.last_name].filter(Boolean).join(" ") || meta.full_name as string | undefined)
    || (email.split("@")[0] || "Account");

  const role = String(prof?.role || "customer").toLowerCase();

  const base: NavItem[] = [
    { href: "/overview", label: "Overview", iconKey: "gauge" },
    { href: "/settings", label: "Settings", iconKey: "settings" },
  ];

  const customer: NavItem[] = [
    { href: "/assistance", label: "Assistance", iconKey: "life-buoy" },
    { href: "/requests", label: "Requests", iconKey: "list-checks" },
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
            <ClientNavList items={customer.slice(0, 2)} />
            <Divider />
            <ClientNavList items={customer.slice(2, 4)} />
            <Divider />
            <ClientNavList items={customer.slice(4)} />
          </div>
        )}
      </nav>
    </aside>
  );
}
