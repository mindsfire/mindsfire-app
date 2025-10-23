import { currentUser } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
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

export type Plan = {
  id: string;
  name: string;
  monthly_price: number | null;
  quota_hours: number | null;
  features: Features;
};

export default async function PlansSection() {
  const db = getSupabaseAdmin();

  const { data: plans = [] } = await db
    .from("plans")
    .select("id,name,monthly_price,quota_hours,features")
    .order("monthly_price", { ascending: true, nullsFirst: true });

  // Fetch current user's active plan
  let activePlan: Plan | null = null;
  const user = await currentUser();
  if (user?.id) {
    // Get profile using admin client to bypass RLS
    const { data: profile } = await db
      .from("profiles")
      .select("id")
      .eq("clerk_id", user.id)
      .limit(1)
      .maybeSingle();
    
    if (profile?.id) {
      // Get active customer_plan using admin client
      const { data: customerPlan } = await db
        .from("customer_plans")
        .select("plan_id")
        .eq("customer_id", profile.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      
      if (customerPlan?.plan_id) {
        activePlan = (plans as Plan[]).find(p => p.id === customerPlan.plan_id) || null;
      }
    }
  }

  return (
    <PlansInlineSlider 
      plans={plans as Plan[]} 
      initialOrder={["Lite","Starter","Essential"]}
      activePlan={activePlan}
    />
  );
}
