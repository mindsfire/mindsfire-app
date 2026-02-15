"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import * as Dialog from "@radix-ui/react-dialog";
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
  price_usd: number | null;
  quota_hours: number | null;
  features: Features;
};

type OrderStatusResponse = {
  ok: boolean;
  status: string;
  paid_at?: string | null;
  active_plan?: { plan_id: string } | null;
  order_plan_id?: string | null;
  error?: string;
};

type RazorpayHandlerResponse = {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
};

export default function PlansInlineSlider({
  plans,
  initialOrder = ["Lite", "Starter", "Essential"],
  activePlan: initialActivePlan = null,
}: {
  plans: Plan[];
  initialOrder?: string[];
  activePlan?: Plan | null;
}) {
  // Build ordered list: initialOrder first (if present), then the rest by price then name
  const baseOrdered = useMemo(() => {
    const byName = new Map(plans.map((p) => [p.name, p] as const));
    const picked: Plan[] = [];
    for (const name of initialOrder) {
      const p = byName.get(name);
      if (p) picked.push(p);
    }
    const remaining = plans.filter((p) => !picked.find((x) => x.id === p.id));
    remaining.sort((a, b) => {
      const ap = a.price_usd ?? Number.MAX_SAFE_INTEGER;
      const bp = b.price_usd ?? Number.MAX_SAFE_INTEGER;
      if (ap !== bp) return ap - bp;
      return a.name.localeCompare(b.name);
    });
    return [...picked, ...remaining];
  }, [plans, initialOrder]);

  // chunks computed after 'ordered' is defined below

  const [index, setIndex] = useState(0);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [confirmingPlan, setConfirmingPlan] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<Plan | null>(initialActivePlan);
  const [confirmPlan, setConfirmPlan] = useState<Plan | null>(null);
  const router = useRouter();

  const formatPrice = useCallback((plan: Plan | null | undefined) => {
    const price = plan?.price_usd;
    if (price === null || price === undefined || Number.isNaN(Number(price))) return "";
    return `$${Number(price).toFixed(2)}/month`;
  }, []);

  const handleUpgrade = useCallback(async (plan: Plan) => {
    try {
      setLoadingPlan(plan.id);
      const res = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_name: plan.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create order");

      const internalOrderId: string | undefined = data.internalOrderId;
      const amountMajor = (Number(data.amount) / 100).toFixed(2);
      const description = `Plan: ${data.plan?.name ?? plan.name} • ${data.currency} ${amountMajor}/mo`;

      // @ts-expect-error Razorpay injected by script
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Mindsfire",
        description,
        order_id: data.orderId,
        prefill: { email: data.customer?.email },
        handler: async function (response: RazorpayHandlerResponse) {
          try {
            setConfirmingPlan(plan.id);
            if (!internalOrderId) return;
            const vres = await fetch("/api/billing/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                internalOrderId,
                razorpay_payment_id: response?.razorpay_payment_id,
                razorpay_order_id: response?.razorpay_order_id,
                razorpay_signature: response?.razorpay_signature,
              }),
            });
            const vdata = await vres.json();
            if (vres.ok && vdata?.ok) {
              const resolvedPlanId: string | undefined = vdata?.active_plan_id;
              if (resolvedPlanId) {
                const newActivePlan = plans.find(pl => pl.id === resolvedPlanId);
                if (newActivePlan) setActivePlan(newActivePlan);
              }
              try { localStorage.setItem('mf_active_plan_first', '1'); } catch {}
              setConfirmingPlan(null);
              router.refresh();
            } else {
              const msg = vdata?.error || "Payment verification failed";
              alert(msg);
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Payment verification error";
            alert(msg);
          }
        },
        modal: {
          ondismiss: function () {
            setLoadingPlan(null);
            setConfirmingPlan(null);
          },
        },
      });
      rzp.open();
      setConfirmingPlan(plan.id);
      setLoadingPlan(null);

      if (internalOrderId) {
        const started = Date.now();
        const timeoutMs = 60000; // 60s
        const intervalMs = 2000; // 2s
        let paid = false;
        let lastStatusData: OrderStatusResponse | null = null;
        while (!paid && Date.now() - started < timeoutMs) {
          try {
            const stRes = await fetch("/api/billing/order-status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ internalOrderId }),
            });
            lastStatusData = await stRes.json();
            if (stRes.ok && lastStatusData?.status === "paid") {
              paid = true;
              const resolvedPlanId: string | undefined = (lastStatusData?.active_plan?.plan_id ?? lastStatusData?.order_plan_id) || undefined;
              if (resolvedPlanId) {
                const newActivePlan = plans.find(pl => pl.id === resolvedPlanId);
                if (newActivePlan) setActivePlan(newActivePlan);
              }
              try { localStorage.setItem('mf_active_plan_first', '1'); } catch {}
              router.refresh();
              break;
            }
          } catch (err) {
            console.error("order status poll error", err);
          }
          await new Promise((r) => setTimeout(r, intervalMs));
        }
        if (!paid) {
          console.warn("Order status polling timed out", lastStatusData);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start checkout";
      alert(msg);
    } finally {
      setLoadingPlan(null);
      setConfirmingPlan(null);
      setConfirmPlan(null);
    }
  }, [plans, router]);

  const ordered = useMemo(() => {
    let res = [...baseOrdered];
    if (activePlan) {
      const idx = res.findIndex(p => p.id === activePlan.id);
      if (idx > 0) {
        const [act] = res.splice(idx, 1);
        res = [act, ...res];
      }
    }
    return res;
  }, [baseOrdered, activePlan]);

  const chunkSize = 3;
  const chunks = useMemo(() => {
    const arr: Plan[][] = [];
    for (let i = 0; i < ordered.length; i += chunkSize) arr.push(ordered.slice(i, i + chunkSize));
    return arr.length ? arr : [[]];
  }, [ordered]);

  const max = Math.max(0, chunks.length - 1);
  const next = () => setIndex((i) => (i < max ? i + 1 : i)); // stop at end
  const prev = () => setIndex((i) => (i > 0 ? i - 1 : i)); // stop at start
  const visible = chunks[index] ?? [];

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
        {visible.map((p: Plan) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-6 h-full">
            <div className="flex h-full flex-col justify-between">
              <div className="flex flex-col gap-0.5">
                <div className="text-base font-medium">{p.name}</div>
                <div className="text-sm text-muted-foreground">
                  {p.features?.description ?? "—"}
                </div>
              </div>

              {activePlan?.id === p.id ? (
                <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/20 w-fit">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Current Plan
                  </span>
                </div>
              ) : (
                <button
                  className={`group relative mt-4 inline-flex items-center gap-2 justify-center rounded-md bg-accent/30 text-accent-foreground px-2 py-1 text-sm border border-transparent w-fit cursor-pointer ${loadingPlan === p.id || confirmingPlan === p.id ? 'opacity-60 cursor-not-allowed' : 'hover:bg-accent/40'}`}
                  disabled={loadingPlan === p.id || confirmingPlan === p.id}
                  aria-disabled={loadingPlan === p.id || confirmingPlan === p.id}
                  aria-busy={loadingPlan === p.id || confirmingPlan === p.id}
                  onClick={() => setConfirmPlan(p)}
                >
                  <span>{loadingPlan === p.id ? "Starting..." : confirmingPlan === p.id ? "Confirming..." : `Upgrade to ${p.name}`}</span>
                  <ArrowUpCircle className={`h-4 w-4 transition-transform ${confirmingPlan === p.id ? 'animate-pulse' : 'group-hover:-translate-y-0.5'}`} />
                </button>
              )}
            </div>
          </div>
        ))}
        {visible.length < 3 &&
          Array.from({ length: 3 - visible.length }).map((_, i) => (
            <div key={`ph-${i}`} className="rounded-xl border border-dashed border-border p-6 opacity-50" />
          ))}
      </div>

      <Dialog.Root open={!!confirmPlan} onOpenChange={(open) => !open && setConfirmPlan(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold">Confirm Upgrade</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              {confirmPlan ? (
                <>
                  Upgrade to <strong>{confirmPlan.name}</strong>.
                  {" "}
                  {formatPrice(confirmPlan) && (
                    <span>Your saved payment method will be charged {formatPrice(confirmPlan)}.</span>
                  )}
                </>
              ) : null}
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                className="inline-flex cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
                onClick={() => confirmPlan && handleUpgrade(confirmPlan)}
                disabled={!confirmPlan}
              >
                Confirm
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
