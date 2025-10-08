import { createClient } from "@supabase/supabase-js";
import { ArrowUpCircle } from "lucide-react";
import PlansInlineSlider from "./plans-inline-slider";

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
      {/* Plans slider with tiny chevron control; preserves 3-card grid */}
      <PlansInlineSlider plans={plans as Plan[]} initialOrder={["Lite","Starter","Essential"]} />
    </div>
  );
}
