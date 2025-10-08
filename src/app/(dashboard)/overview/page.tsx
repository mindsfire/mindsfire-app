import { createClient } from "@supabase/supabase-js";
import PlansInlineSlider from "./plans-inline-slider";

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

type Plan = {
  id: string;
  name: string;
  monthly_price: number | null;
  quota_hours: number | null;
  features: Features;
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

  return (
    <div className="space-y-6">
      {/* Plans slider with tiny chevron control; preserves 3-card grid */}
      <PlansInlineSlider plans={plans as Plan[]} initialOrder={["Lite","Starter","Essential"]} />
    </div>
  );
}
