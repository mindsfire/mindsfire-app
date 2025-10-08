import { createClient } from "@supabase/supabase-js";
import { ArrowUpCircle } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  monthly_price: number | null;
  quota_hours: number | null;
  features: any;
};

export default async function OverviewPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  );

  const { data: plans = [] } = await supabase
    .from("plans")
    .select("id,name,monthly_price,quota_hours,features")
    .order("monthly_price", { ascending: true, nullsFirst: true });

  // Pick exact three plans in desired order
  const order = ["Lite", "Starter", "Essential"] as const;
  const three = order
    .map((n) => (plans as Plan[]).find((p) => p.name === n))
    .filter(Boolean) as Plan[];

  return (
    <div className="space-y-6">
      {/* Simple plans row like Cursor: title, short description, CTA */}
      <div className="space-y-2">
        <div className="grid gap-4 md:grid-cols-3">
          {three.map((p) => (
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
        </div>
      </div>
    </div>
  );
}
