import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Razorpay from "razorpay";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = (await req.json().catch(() => ({}))) as Partial<{ plan_id: string; plan_name: string }>;
    const { plan_id, plan_name } = parsed;
    if (!plan_id && !plan_name) {
      return NextResponse.json({ error: "Provide plan_id or plan_name" }, { status: 400 });
    }

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      return NextResponse.json({ error: "Razorpay env vars missing" }, { status: 500 });
    }

    const db = getSupabaseAdmin();

    // Lookup customer profile id by clerk id
    const { data: me, error: meErr } = await db
      .from("profiles")
      .select("id, email")
      .eq("clerk_id", userId)
      .single();
    if (meErr || !me) return NextResponse.json({ error: "Customer profile not found" }, { status: 400 });

    // Fetch plan
    const planFilter = plan_id ? { column: "id", value: plan_id } : { column: "name", value: plan_name };
    const { data: plan, error: planErr } = await db
      .from("plans")
      .select("id, name, monthly_price")
      .eq(planFilter.column, planFilter.value)
      .single();
    if (planErr || !plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const amountPaise = Math.round(Number(plan.monthly_price) * 100);

    const razorpay = new Razorpay({ key_id, key_secret });
    // Build a compact receipt (<=40 chars): p_<plan>_<8-digit time>_<6id>
    const ts8 = Date.now().toString().slice(-8);
    const planTag = String(plan.name || "plan").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
    const cust6 = String(me.id || "c").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
    const receipt = `p_${planTag}_${ts8}_${cust6}`.slice(0, 40);

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: { plan_id: plan.id, plan_name: plan.name, customer_id: me.id },
    });

    // Persist pending order
    const { data: inserted, error: insErr } = await db
      .from("orders")
      .insert({
        customer_id: me.id,
        plan_id: plan.id,
        razorpay_order_id: order.id,
        amount: amountPaise,
        currency: "INR",
        status: "pending",
      })
      .select("id")
      .single();
    if (insErr) return NextResponse.json({ error: "Failed to create order record" }, { status: 500 });

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: key_id,
      customer: { id: me.id, email: me.email },
      plan: { id: plan.id, name: plan.name },
      internalOrderId: inserted.id,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    console.error("create-order error", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
