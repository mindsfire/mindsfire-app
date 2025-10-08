"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowUpCircle } from "lucide-react";

export type Plan = {
  id: string;
  name: string;
  monthly_price: number | null;
  quota_hours: number | null;
  features: any;
};

export default function PlansInlineSlider({
  plans,
  initialOrder = ["Lite", "Starter", "Essential"],
}: {
  plans: Plan[];
  initialOrder?: string[];
}) {
  // Build ordered list: initialOrder first (if present), then the rest by price then name
  const ordered = useMemo(() => {
    const byName = new Map(plans.map((p) => [p.name, p] as const));
    const picked: Plan[] = [];
    for (const name of initialOrder) {
      const p = byName.get(name);
      if (p) picked.push(p);
    }
    const remaining = plans.filter((p) => !picked.find((x) => x.id === p.id));
    remaining.sort((a, b) => {
      const ap = a.monthly_price ?? Number.MAX_SAFE_INTEGER;
      const bp = b.monthly_price ?? Number.MAX_SAFE_INTEGER;
      if (ap !== bp) return ap - bp;
      return a.name.localeCompare(b.name);
    });
    return [...picked, ...remaining];
  }, [plans, initialOrder]);

  const chunkSize = 3;
  const chunks = useMemo(() => {
    const arr: Plan[][] = [];
    for (let i = 0; i < ordered.length; i += chunkSize) arr.push(ordered.slice(i, i + chunkSize));
    return arr.length ? arr : [[]];
  }, [ordered]);

  const [index, setIndex] = useState(0);
  const max = Math.max(0, chunks.length - 1);
  const next = () => setIndex((i) => (i < max ? i + 1 : i)); // stop at end
  const prev = () => setIndex((i) => (i > 0 ? i - 1 : i)); // stop at start

  const visible = chunks[index] ?? [];

  return (
    <div className="space-y-2 group relative">
      {/* Overlay chevrons: appear on hover, centered vertically; hidden when not usable */}
      {max > 0 && (
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="relative h-full">
            {index > 0 && (
              <div className="absolute -left-5 top-1/2 -translate-y-1/2 pl-1">
                <button
                  aria-label="Previous plans"
                  onClick={prev}
                  className="pointer-events-auto h-8 w-8 inline-flex items-center justify-center rounded-full border border-border bg-card/70 backdrop-blur text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            )}
            {index < max && (
              <div className="absolute -right-4 top-1/2 -translate-y-1/2 pr-1">
                <button
                  aria-label="Next plans"
                  onClick={next}
                  className="pointer-events-auto h-8 w-8 inline-flex items-center justify-center rounded-full border border-border bg-card/70 backdrop-blur text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {visible.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-6 h-full">
            <div className="flex h-full flex-col justify-between">
              <div className="flex flex-col gap-0.5">
                <div className="text-base font-medium">{p.name}</div>
                <div className="text-sm text-muted-foreground">
                  {p.features?.description ?? "—"}
                </div>
              </div>

              <button className="group relative mt-4 inline-flex items-center gap-2 justify-center rounded-md bg-accent/30 text-accent-foreground px-2 py-1 text-sm border border-transparent hover:bg-accent/40 w-fit">
                {p.name !== "Lite" && (
                  <ArrowUpCircle className="h-5 w-5 text-muted-foreground group-hover:text-accent-foreground/80" />
                )}
                <span>
                  {p.name === "Lite"
                    ? "Start Lite Now"
                    : p.name === "Starter"
                    ? "Upgrade to Starter"
                    : "Upgrade to Pro"}
                </span>
              </button>
            </div>
          </div>
        ))}
        {visible.length < 3 &&
          Array.from({ length: 3 - visible.length }).map((_, i) => (
            <div key={`ph-${i}`} className="rounded-xl border border-dashed border-border p-6 opacity-50" />
          ))}
      </div>
    </div>
  );
}
