"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Gauge, Settings, Puzzle, UsersRound } from "lucide-react";

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
  return (
    <header className="h-[120px] bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-[60px] grid h-[120px] items-center grid-cols-[160px_1fr_160px]">
        {/* Left: Logo (tucked) */}
        <div className="flex items-center">
          <Link aria-label="Homepage" href="/dashboard" className="relative flex w-fit items-center overflow-hidden">
            <div className="pointer-events-none relative size-6 lg:size-8">
              <div className="absolute inset-0 rounded-sm bg-primary/80" />
            </div>
          </Link>
        </div>

        {/* Center: Section tabs */}
        <div className="flex items-center justify-center">
          <p className="text-base leading-6">Dashboard</p>
        </div>

        {/* Right: Avatar (tucked) */}
        <div className="flex items-center justify-end">
          <button aria-label="User menu" className="flex h-12 w-12 items-center justify-center rounded-full outline-none focus:outline-none">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50">
              <span className="text-sm font-medium">SP</span>
            </div>
          </button>
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
