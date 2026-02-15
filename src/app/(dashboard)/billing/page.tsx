import * as Dialog from "@radix-ui/react-dialog";
import { currentUser } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export default async function Page() {
  const u = await currentUser();
  let planName = "No plan";
  let planPrice: number | null = null;

  try {
    if (u?.id) {
      const db = getSupabaseAdmin();
      const { data: profile } = await db
        .from("profiles")
        .select("id")
        .eq("clerk_id", u.id)
        .limit(1)
        .maybeSingle();

      if (profile?.id) {
        const { data: activePlanRow } = await db
          .from("customer_plans")
          .select("plan_id, started_at")
          .eq("customer_id", profile.id)
          .eq("status", "active")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activePlanRow?.plan_id) {
          const { data: planRow } = await db
            .from("plans")
            .select("name, price_usd")
            .eq("id", activePlanRow.plan_id)
            .limit(1)
            .maybeSingle();

          if (planRow?.name) planName = planRow.name;
          if (planRow?.price_usd !== null && planRow?.price_usd !== undefined) {
            planPrice = Number(planRow.price_usd);
          }
        }
      }
    }
  } catch {}

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold">Manage Plans</h1>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xs font-medium">Manage your plans</h2>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Your account is currently on
              {" "}
              <span className="text-foreground font-medium">{planName}</span>
              {" "}
              <span className="inline-flex items-center rounded-sm bg-accent/30 px-1 py-0 text-[9px] font-medium leading-4 text-accent-foreground shrink-0">Active</span>
              {" "}
              plan
              {planPrice !== null ? ` that costs $${planPrice.toFixed(2)}/month.` : "."}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/overview"
                className="inline-flex h-7 cursor-pointer items-center justify-center rounded-md border border-green-600 bg-[#f0f8ff] px-3 text-xs font-medium text-green-700 hover:bg-[#E9F3FF]"
              >
                Switch Plan
              </a>

              <Dialog.Root>
                <Dialog.Trigger asChild>
                  <button className="inline-flex h-7 cursor-pointer items-center justify-center rounded-md border border-red-600 bg-[#f0f8ff] px-3 text-xs font-medium text-red-700 hover:bg-[#E9F3FF]">
                    Cancel Plan
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
                  <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-xl">
                    <Dialog.Title className="text-lg font-semibold">Cancel your plan</Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                      If you choose to cancel your plan, you&apos;ll still have access until the end of your billing period.
                    </Dialog.Description>
                    <div className="mt-6 flex justify-end gap-3">
                      <Dialog.Close asChild>
                        <button className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">
                          Close
                        </button>
                      </Dialog.Close>
                      <button className="inline-flex cursor-pointer items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">
                        Cancel Plan
                      </button>
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </div>
          </div>
        </div>
      </section>

      <h2 className="text-xl font-semibold">Billing & Invoices</h2>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xs font-medium">Invoices</h2>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Your recent invoices will appear here.</div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xs font-medium">Payment Method</h2>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Add or update your payment method (coming soon).</div>
        </div>
      </section>
    </div>
  );
}
