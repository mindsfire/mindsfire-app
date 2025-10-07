"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/overview", label: "Overview" },
  { href: "/settings", label: "Settings" },
  { href: "/integrations", label: "Integrations" },
  { href: "/users", label: "Users" },
];

function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 h-dvh bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
      <div className="flex h-14 items-center px-4">
        <div className="h-6 w-6 rounded-sm bg-primary/80" />
        <span className="sr-only">Logo</span>
      </div>
      <nav className="px-2 pb-4">
        <div className="px-2 text-xs uppercase text-muted-foreground mb-2">General</div>
        <ul className="space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    "flex h-9 items-center gap-2 rounded-lg px-3 text-sm transition-colors",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground",
                  ].join(" ")}
                >
                  <span>{item.label}</span>
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
    <header className="sticky top-0 z-10 h-30 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-15 grid h-30 items-center grid-cols-[160px_1fr_160px]">
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
      <div className="mx-auto w-full max-w-7xl px-6 grid grid-cols-[260px_24px_1fr]">
        <Sidebar />
        {/* gutter column to create visual gap like Cursor (no border) */}
        <div aria-hidden className="hidden md:block" />
        <main className="w-full py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
