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
  return (
    <aside className="sticky top-0 h-[calc(100dvh-120px)] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
      <div className="pl-2 px-0 py-4 space-y-1 h-[64px]">
        <div className="text-sm font-semibold leading-tight truncate">Sandesh Parjanya</div>
        <div className="text-xs text-muted-foreground leading-tight">Free Plan</div>
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
    <header className="h-[120px] bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-[60px] grid h-[120px] items-center grid-cols-[160px_1fr_160px]">
        {/* Left: Logo (wordmark) */}
        <div className="flex items-center">
          <Link aria-label="Homepage" href="/dashboard" className="relative flex w-fit items-center overflow-hidden">
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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50">
              <span className="text-sm font-medium">{(profile.name?.[0] ?? "S").toUpperCase()}</span>
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 w-64 rounded-lg border border-border bg-card text-card-foreground shadow-lg p-3">
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
