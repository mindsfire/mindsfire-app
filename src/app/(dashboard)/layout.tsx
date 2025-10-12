"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Gauge, Settings, Puzzle, UsersRound, LogOut, LifeBuoy, ListChecks, BarChart3, ReceiptText, MessageCircle, Gift } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const nav = [
  { href: "/overview", label: "Overview", icon: Gauge },
  { href: "/settings", label: "Settings", icon: Settings },
  // Customer sections
  { href: "/assistance", label: "Assistance", icon: LifeBuoy },
  { href: "/requests", label: "Requests", icon: ListChecks },
  { href: "/usage", label: "Usage", icon: BarChart3 },
  { href: "/billing", label: "Billing & Invoices", icon: ReceiptText },
  { href: "/contact", label: "Contact Us", icon: MessageCircle },
  { href: "/referrals", label: "Referrals", icon: Gift },
  // Admin-only
  { href: "/integrations", label: "Integrations", icon: Puzzle },
  { href: "/users", label: "Users", icon: UsersRound },
] as const;

function Sidebar() {
  const pathname = usePathname();
  const [planLabel, setPlanLabel] = useState<string>("No plan");
  const [displayName, setDisplayName] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [role, setRole] = useState<string>("customer");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      const userId = user?.id;
      if (!userId) return;
      // Resolve display name: profiles.name → user_metadata.first_name/last_name/full_name → email prefix
      const { data: prof } = await supabase
        .from("profiles")
        .select("first_name, last_name, name, email, role")
        .eq("id", userId)
        .maybeSingle();
      const meta = (user?.user_metadata ?? {}) as Record<string, unknown> & {
        first_name?: string; last_name?: string; full_name?: string;
      };
      const emailPrefix = (prof?.email || user?.email || "").split("@")[0] || "Account";
      const resolvedName = ([prof?.first_name, prof?.last_name].filter(Boolean).join(" "))
        || prof?.name
        || ([meta.first_name, meta.last_name].filter(Boolean).join(" ") || meta.full_name)
        || emailPrefix;
      if (mounted) {
        setDisplayName(resolvedName);
        if (prof?.role) setRole(prof.role);
      }

      const { data } = await supabase
        .from("subscriptions")
        .select("status, current_period_end, plan:plan_id(name)")
        .eq("customer_id", userId)
        .in("status", ["trialing", "active"]) as unknown as {
          data: Array<{ status: string; current_period_end: string | null; plan: { name: string } | null }>
        };
      const sub = (data || [])
        .sort((a, b) => (new Date(b.current_period_end || 0).getTime() - new Date(a.current_period_end || 0).getTime()))[0];
      if (!mounted) return;
      setPlanLabel(sub?.plan?.name ?? "No plan");
      setLoaded(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <aside className="sticky top-0 h-[calc(100dvh-120px)] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
      <div className="pl-2 px-0 py-4 space-y-1 h-[64px]">
        {loaded ? (
          <>
            <div className="text-sm font-semibold leading-tight truncate">{displayName}</div>
            <div className="text-xs text-muted-foreground leading-tight">{planLabel}</div>
          </>
        ) : (
          <>
            <div className="h-4 w-28 rounded bg-muted/40 animate-pulse" />
            <div className="h-3 w-16 rounded bg-muted/30 animate-pulse" />
          </>
        )}
      </div>
      <nav className="px-0 pb-4">
        {role === 'admin' ? (
          <ul className="space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={[
                      "group flex h-9 items-center gap-2 rounded-lg px-2 text-sm transition-all",
                      active
                        ? "bg-secondary text-secondary-foreground"
                        : "hover:bg-secondary hover:text-[#0a0c10]",
                    ].join(" ")}
                  >
                    <item.icon className={[
                      "size-4 [stroke-width:2]",
                      active
                        ? "text-secondary-foreground [stroke-width:2.5]"
                        : "text-muted-foreground group-hover:text-[#0a0c10] group-hover:[stroke-width:2.5]",
                    ].join(" ")} />
                    <span className={active ? "font-semibold" : "group-hover:font-semibold"}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="space-y-2">
            {/* Group 1: Overview, Settings */}
            <ul className="space-y-1">
              {nav.filter((i) => i.label === 'Overview' || i.label === 'Settings').map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        "group flex h-9 items-center gap-2 rounded-lg px-2 text-sm transition-all",
                        active
                          ? "bg-secondary text-secondary-foreground"
                          : "hover:bg-secondary hover:text-[#0a0c10]",
                      ].join(" ")}
                    >
                      <item.icon className={[
                        "size-4 [stroke-width:2]",
                        active
                          ? "text-secondary-foreground [stroke-width:2.5]"
                          : "text-muted-foreground group-hover:text-[#0a0c10] group-hover:[stroke-width:2.5]",
                      ].join(" ")} />
                      <span className={active ? "font-semibold" : "group-hover:font-semibold"}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mx-2 h-px bg-border" />

            {/* Group 2: Assistance, Requests */}
            <ul className="space-y-1">
              {nav.filter((i) => i.label === 'Assistance' || i.label === 'Requests').map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        "group flex h-9 items-center gap-2 rounded-lg px-2 text-sm transition-all",
                        active
                          ? "bg-secondary text-secondary-foreground"
                          : "hover:bg-secondary hover:text-[#0a0c10]",
                      ].join(" ")}
                    >
                      <item.icon className={[
                        "size-4 [stroke-width:2]",
                        active
                          ? "text-secondary-foreground [stroke-width:2.5]"
                          : "text-muted-foreground group-hover:text-[#0a0c10] group-hover:[stroke-width:2.5]",
                      ].join(" ")} />
                      <span className={active ? "font-semibold" : "group-hover:font-semibold"}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mx-2 h-px bg-border" />

            {/* Group 3: Usage, Billing & Invoices */}
            <ul className="space-y-1">
              {nav.filter((i) => i.label === 'Usage' || i.label === 'Billing & Invoices').map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        "group flex h-9 items-center gap-2 rounded-lg px-2 text-sm transition-all",
                        active
                          ? "bg-secondary text-secondary-foreground"
                          : "hover:bg-secondary hover:text-[#0a0c10]",
                      ].join(" ")}
                    >
                      <item.icon className={[
                        "size-4 [stroke-width:2]",
                        active
                          ? "text-secondary-foreground [stroke-width:2.5]"
                          : "text-muted-foreground group-hover:text-[#0a0c10] group-hover:[stroke-width:2.5]",
                      ].join(" ")} />
                      <span className={active ? "font-semibold" : "group-hover:font-semibold"}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mx-2 h-px bg-border" />

            {/* Group 4: Contact Us, Referrals */}
            <ul className="space-y-1">
              {nav.filter((i) => i.label === 'Contact Us' || i.label === 'Referrals').map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        "group flex h-9 items-center gap-2 rounded-lg px-2 text-sm transition-all",
                        active
                          ? "bg-secondary text-secondary-foreground"
                          : "hover:bg-secondary hover:text-[#0a0c10]",
                      ].join(" ")}
                    >
                      <item.icon className={[
                        "size-4 [stroke-width:2]",
                        active
                          ? "text-secondary-foreground [stroke-width:2.5]"
                          : "text-muted-foreground group-hover:text-[#0a0c10] group-hover:[stroke-width:2.5]",
                      ].join(" ")} />
                      <span className={active ? "font-semibold" : "group-hover:font-semibold"}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
}

function Topbar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<{ name?: string; email?: string; first_name?: string; last_name?: string }>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  useEffect(() => {
    // Fetch user and profile details for initials
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      const base = {
        name: (u?.user_metadata?.full_name as string) || undefined,
        email: u?.email || undefined,
      } as { name?: string; email?: string; first_name?: string; last_name?: string };
      if (u?.id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("first_name, last_name, name, email")
          .eq("id", u.id)
          .maybeSingle();
        setProfile({
          name: prof?.name ?? base.name,
          email: prof?.email ?? base.email,
          first_name: prof?.first_name ?? undefined,
          last_name: prof?.last_name ?? undefined,
        });
      } else {
        setProfile(base);
      }
      setAvatarLoaded(true);
    });

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.replace("/login");
  };

  // Compute two-letter initials
  const initials = (() => {
    const fn = profile.first_name?.trim();
    const ln = profile.last_name?.trim();
    if (fn || ln) return `${fn?.[0] ?? ''}${ln?.[0] ?? ''}`.toUpperCase() || '';
    const n = (profile.name ?? '').trim();
    if (n) {
      const parts = n.split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return n.slice(0, 2).toUpperCase();
    }
    const ep = (profile.email ?? '').split('@')[0] ?? '';
    if (ep) {
      const parts = ep.replace(/[._-]+/g, ' ').split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return ep.slice(0, 2).toUpperCase();
    }
    return '';
  })();

  return (
    <header className="relative z-50 h-[120px] bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-[60px] grid h-[120px] items-center grid-cols-[160px_1fr_160px]">
        {/* Left: Logo (wordmark) */}
        <div className="flex items-center">
          <Link aria-label="Homepage" href="/overview" className="relative flex w-fit items-center overflow-hidden">
            <Image
              src="/mindsfire-black-logo.svg"
              alt="Mindsfire"
              width={1478}
              height={184}
              priority
              className="w-[160px] h-auto"
            />
          </Link>
        </div>

        {/* Center: Section tabs */}
        <div className="flex items-center justify-center">
          <p className="text-base leading-6">Dashboard</p>
        </div>

        {/* Right: Avatar (tucked) */}
        <div ref={menuRef} className="relative flex items-center justify-end">
          <button
            aria-label="User menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-12 w-12 items-center justify-center rounded-full outline-none focus:outline-none"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <span className="text-[11px] font-semibold tracking-wide">{avatarLoaded ? initials : ''}</span>
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-border bg-card text-card-foreground shadow-lg p-3">
              <div className="pb-3 mb-3 border-b border-border">
                <div className="text-sm font-semibold truncate">{profile.name ?? "Account"}</div>
                {profile.email && (
                  <div className="text-xs text-muted-foreground truncate">{profile.email}</div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between text-left text-sm rounded-md px-2 py-2 hover:bg-muted/50"
              >
                <span>Log Out</span>
                <LogOut className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Topbar />
      <div className="mx-auto w-full max-w-7xl px-6 grid grid-cols-[260px_20px_1fr] min-h-[calc(100dvh-120px)]">
        <Sidebar />
        {/* gutter column to create visual gap like Cursor (no border) */}
        <div aria-hidden className="hidden md:block" />
        <main className="w-full pt-4 pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
