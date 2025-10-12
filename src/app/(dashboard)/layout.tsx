"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Gauge, Settings, Puzzle, UsersRound, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const nav = [
  { href: "/overview", label: "Overview", icon: Gauge },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/integrations", label: "Integrations", icon: Puzzle },
  { href: "/users", label: "Users", icon: UsersRound },
] as const;

function Sidebar() {
  const pathname = usePathname();
  const [planLabel, setPlanLabel] = useState<string>("No plan");
  const [displayName, setDisplayName] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

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
        .select("first_name, last_name, name, email")
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
      if (mounted) setDisplayName(resolvedName);

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
      </nav>
    </aside>
  );
}

function Topbar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<{ name?: string; email?: string }>({});
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch user info for display
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setProfile({
        name: (u?.user_metadata?.full_name as string) || undefined,
        email: u?.email || undefined,
      });
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
              <span className="text-sm font-medium">{(profile.name?.[0] ?? "S").toUpperCase()}</span>
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
