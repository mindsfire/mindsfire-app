import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// GET /api/billing/order-status?internalOrderId=<uuid>
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const internalOrderId = url.searchParams.get("internalOrderId");
    if (!internalOrderId) {
      return NextResponse.json({ error: "Missing internalOrderId" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Resolve current user profile id
    const { data: me, error: meErr } = await db
      .from("profiles")
      .select("id")
      .eq("clerk_id", userId)
      .single();
    if (meErr || !me) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    // Fetch order ensuring ownership
    const { data: order, error: ordErr } = await db
      .from("orders")
      .select("id, customer_id, status, paid_at, plan_id")
      .eq("id", internalOrderId)
      .limit(1)
      .single();
    if (ordErr || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.customer_id !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // If paid, also return the active plan for convenience
    let activePlan: { plan_id: string } | null = null;
    if (order.status === "paid") {
      try {
        const { data: act } = await db
          .from("customer_plans")
          .select("plan_id")
          .eq("customer_id", me.id)
          .eq("status", "active")
          .limit(1)
          .single();
        if (act) activePlan = act as { plan_id: string };
      } catch {}
    }

    type OrderRow = { id: string; customer_id: string; status: string; paid_at: string | null; plan_id: string | null };
    const o = order as OrderRow;
    return NextResponse.json({ ok: true, status: o.status, paid_at: o.paid_at, active_plan: activePlan, order_plan_id: o.plan_id });
  } catch (err: unknown) {
    // During polling we prefer a soft failure so the client can keep retrying
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, status: "unknown", error: msg }, { status: 200 });
  }
}
