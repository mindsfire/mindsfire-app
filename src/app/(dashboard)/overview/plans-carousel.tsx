"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type Plan = {
  id: string;
  name: string;
  monthly_price: number | null;
  quota_hours: number | null;
  features: any;
};

function formatPrice(n: number | null | undefined) {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
      n
    );
  } catch {
    return `$${n}`;
  }
}

export default function PlansCarousel({ plans }: { plans: Plan[] }) {
  const chunkSize = 3;
  const chunks = useMemo(() => {
    const list = [...plans];
    // Stable order by monthly price then name (in case API didn't)
    list.sort((a, b) => {
      const ap = a.monthly_price ?? Number.MAX_SAFE_INTEGER;
      const bp = b.monthly_price ?? Number.MAX_SAFE_INTEGER;
      if (ap !== bp) return ap - bp;
      return a.name.localeCompare(b.name);
    });
    const arr: Plan[][] = [];
    for (let i = 0; i < list.length; i += chunkSize) arr.push(list.slice(i, i + chunkSize));
    return arr.length ? arr : [[]];
  }, [plans]);

  const [index, setIndex] = useState(0);
  const max = Math.max(0, chunks.length - 1);

  const next = () => setIndex((i) => (i < max ? i + 1 : i));
  const prev = () => setIndex((i) => (i > 0 ? i - 1 : i));

  const visible = chunks[index] ?? [];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">Choose a plan</div>
        <div className="flex gap-2">
          <button
            aria-label="Previous plans"
            onClick={prev}
            disabled={index === 0}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border hover:bg-accent hover:text-accent-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            aria-label="Next plans"
            onClick={next}
            disabled={index === max}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border hover:bg-accent hover:text-accent-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {visible.map((p) => {
          const hourly = p.features?.hourly_rate;
          const addlHourly = p.features?.additional_hourly_rate;
          const rollover = p.features?.rollover_percent;
          const billing = p.features?.billing;
          const popular = Boolean(p.features?.most_popular);

          return (
            <div key={p.id} className="rounded-lg border border-border bg-background p-4">
              {popular && (
                <div className="mb-2 inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  Most Popular
                </div>
              )}
              <div className="text-sm text-muted-foreground">{billing === "hourly" ? "Hourly" : "Monthly"}</div>
              <div className="text-lg font-semibold">{p.name}</div>
              <div className="mt-1 text-2xl font-bold">{formatPrice(p.monthly_price)}</div>
              {p.monthly_price ? (
                <div className="text-xs text-muted-foreground">billed monthly</div>
              ) : (
                <div className="text-xs text-muted-foreground">pay as you go</div>
              )}

              <div className="mt-4 space-y-1 text-sm">
                {p.quota_hours ? (
                  <div>
                    <span className="font-medium">{p.quota_hours}hr</span> included / mo
                  </div>
                ) : null}
                {hourly != null && (
                  <div>
                    Hourly rate at <span className="font-medium">${hourly}/hr</span>
                  </div>
                )}
                {addlHourly != null && (
                  <div>
                    Additional hourly at <span className="font-medium">${addlHourly}/hr</span>
                  </div>
                )}
                {rollover != null && (
                  <div>Rollover up to {rollover}%</div>
                )}
              </div>

              <button className="mt-4 h-8 w-full rounded-md border border-border text-sm hover:bg-accent hover:text-accent-foreground">
                Get Started
              </button>
            </div>
          );
        })}
        {visible.length < 3 &&
          Array.from({ length: 3 - visible.length }).map((_, i) => (
            <div key={`placeholder-${i}`} className="rounded-lg border border-dashed border-border p-4 opacity-50" />
          ))}
      </div>

      {/* Dots indicator */}
      <div className="mt-4 flex items-center justify-center gap-1.5">
        {chunks.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={[
              "h-1.5 w-4 rounded-full",
              i === index ? "bg-foreground/80" : "bg-muted",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}
