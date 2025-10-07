"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

function applyTheme(theme: "theme-a" | "theme-b") {
  const root = document.documentElement;
  root.classList.remove("theme-a", "theme-b");
  root.classList.add(theme);
}

function toggleDark() {
  const root = document.documentElement;
  root.classList.toggle("dark");
}

export default function ThemeDemoPage() {
  const [theme, setTheme] = useState<"theme-a" | "theme-b">("theme-a");
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [isDark]);

  return (
    <div className="min-h-dvh bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Mindsfire Theme Demo</h1>
          <div className="flex gap-2">
            <Button variant={theme === "theme-a" ? "default" : "outline"} onClick={() => setTheme("theme-a")}>Option A</Button>
            <Button variant={theme === "theme-b" ? "default" : "outline"} onClick={() => setTheme("theme-b")}>Option B</Button>
            <Button variant="secondary" onClick={() => setIsDark(d => !d)}>{isDark ? "Dark" : "Light"}</Button>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card text-card-foreground p-5 space-y-3">
            <h2 className="text-lg font-medium">Primary</h2>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md" style={{ background: "hsl(var(--primary))" }} />
              <div className="text-sm text-muted-foreground">--primary</div>
            </div>
            <Button>Primary Button</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
          </div>
          <div className="rounded-xl border border-border bg-card text-card-foreground p-5 space-y-3">
            <h2 className="text-lg font-medium">Surfaces</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md h-12 bg-background border border-border" />
              <div className="rounded-md h-12 bg-card border border-border" />
              <div className="rounded-md h-12 bg-muted" />
              <div className="rounded-md h-12 bg-secondary" />
            </div>
            <p className="text-sm text-muted-foreground">Background, Card, Muted, Secondary</p>
          </div>
          <div className="rounded-xl border border-border bg-card text-card-foreground p-5 space-y-3">
            <h2 className="text-lg font-medium">Typography & States</h2>
            <p>Foreground text on card.</p>
            <p className="text-muted-foreground">Muted foreground text.</p>
            <div className="flex gap-2">
              <Button className="ring-2 ring-[hsl(var(--ring))]">Focus Ring</Button>
              <Button className="bg-destructive text-destructive-foreground hover:opacity-90">Destructive</Button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border p-5">
          <h2 className="text-lg font-medium mb-4">Example App Shell</h2>
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
            <aside className="rounded-lg bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] border border-[hsl(var(--sidebar-border))] p-4 space-y-2">
              <div className="font-semibold">Sidebar</div>
              <div className="text-sm opacity-80">Overview</div>
              <div className="text-sm opacity-80">Requests</div>
              <div className="text-sm opacity-80">Settings</div>
            </aside>
            <main className="rounded-lg bg-card text-card-foreground border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Topbar</div>
                <Button size="sm">Primary CTA</Button>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-md border border-border p-4">
                  <div className="text-sm text-muted-foreground">Plan</div>
                  <div className="font-medium">Pro</div>
                </div>
                <div className="rounded-md border border-border p-4">
                  <div className="text-sm text-muted-foreground">Usage</div>
                  <div className="font-medium">42%</div>
                </div>
                <div className="rounded-md border border-border p-4">
                  <div className="text-sm text-muted-foreground">Integrations</div>
                  <div className="font-medium">GitHub • Slack</div>
                </div>
              </div>
            </main>
          </div>
        </section>
      </div>
    </div>
  );
}
