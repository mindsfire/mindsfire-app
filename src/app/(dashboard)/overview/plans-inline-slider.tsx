"use client";

import { useMemo, useState } from "react";
import Script from "next/script";
import { ChevronLeft, ChevronRight, ArrowUpCircle } from "lucide-react";

type Features = {
  description?: string;
  hourly_rate?: number;
  additional_hourly_rate?: number;
  rollover_percent?: number;
  billing?: string;
  most_popular?: boolean;
  dedicated_or_fractional?: boolean;
  custom_tasks?: boolean;
  technical_support?: boolean;
  planning_and_scheduling?: boolean;
  sort_index?: number;
};

export type Plan = {
  id: string;
  name: string;
  monthly_price: number | null;
  quota_hours: number | null;
  features: Features;
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
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [confirmingPlan, setConfirmingPlan] = useState<string | null>(null);

  return (
    <div className="space-y-2 group relative">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
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

              <button
                className={`group relative mt-4 inline-flex items-center gap-2 justify-center rounded-md bg-accent/30 text-accent-foreground px-2 py-1 text-sm border border-transparent w-fit cursor-pointer ${loadingPlan === p.id || confirmingPlan === p.id ? 'opacity-60 cursor-not-allowed' : 'hover:bg-accent/40'}`}
                disabled={loadingPlan === p.id || confirmingPlan === p.id}
                aria-disabled={loadingPlan === p.id || confirmingPlan === p.id}
                aria-busy={loadingPlan === p.id || confirmingPlan === p.id}
                onClick={async () => {
                  try {
                    setLoadingPlan(p.id);
                    const res = await fetch("/api/billing/create-order", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ plan_name: p.name }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.error || "Failed to create order");

                    const amountInr = (Number(data.amount) / 100).toFixed(2);
                    const description = `Plan: ${data.plan?.name ?? p.name} • INR ${amountInr}/mo`;

                    // @ts-expect-error Razorpay injected by script
                    const rzp = new window.Razorpay({
                      key: data.keyId,
                      amount: data.amount,
                      currency: data.currency,
                      name: "Mindsfire",
                      description,
                      order_id: data.orderId,
                      prefill: { email: data.customer?.email },
                      handler: function () {
                        // Payment completed; polling already running below
                        // Keep confirming state until webhook confirms
                      },
                      modal: {
                        ondismiss: function () {
                          // User closed without paying
                          setLoadingPlan(null);
                          setConfirmingPlan(null);
                        },
                      },
                    });
                    rzp.open();
                    // Transition from Starting... -> Confirming... once Checkout is open
                    setConfirmingPlan(p.id);
                    setLoadingPlan(null);

                    // Poll order status until paid or timeout
                    const internalOrderId: string | undefined = data.internalOrderId;
                    if (internalOrderId) {
                      const started = Date.now();
                      const timeoutMs = 60000; // 60s
                      const intervalMs = 2000; // 2s
                      let paid = false;
                      while (!paid && Date.now() - started < timeoutMs) {
                        try {
                          const sres = await fetch(`/api/billing/order-status?internalOrderId=${internalOrderId}`);
                          const sdata = await sres.json();
                          if (sres.ok && sdata?.status === "paid") {
                            paid = true;
                            break;
                          }
                        } catch {}
                        await new Promise((r) => setTimeout(r, intervalMs));
                      }
                      if (paid) {
                        // Refresh page to reflect new plan pill
                        window.location.reload();
                      } else {
                        // Timed out; allow user to retry
                        setConfirmingPlan(null);
                      }
                    }
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : "Unable to start checkout";
                    alert(msg);
                  } finally {
                    setLoadingPlan(null);
                  }
                }}
              >
                {p.name !== "Lite" && (
                  <ArrowUpCircle className="h-5 w-5 text-muted-foreground group-hover:text-accent-foreground/80" />
                )}
                <span>
                  {loadingPlan === p.id
                    ? 'Starting...'
                    : confirmingPlan === p.id
                      ? 'Confirming...'
                      : p.name === "Lite"
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
