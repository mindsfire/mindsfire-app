import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/*
  POST /api/billing/verify-payment
  Body: {
    internalOrderId: string,
    razorpay_payment_id: string,
    razorpay_order_id: string,
    razorpay_signature: string
  }
  Verifies signature and updates orders + customer_plans (idempotent).
*/
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { internalOrderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = (await req.json().catch(() => ({}))) as {
      internalOrderId?: string;
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
    };

    if (!internalOrderId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret) return NextResponse.json({ error: "Missing RAZORPAY_KEY_SECRET" }, { status: 500 });

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
      .select("id, customer_id, plan_id, status, razorpay_order_id")
      .eq("id", internalOrderId)
      .single();
    if (ordErr || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.customer_id !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Cross-check Razorpay order IDs
    if (order.razorpay_order_id !== razorpay_order_id) {
      return NextResponse.json({ error: "Order mismatch" }, { status: 400 });
    }

    // Verify signature: sha256(order_id + '|' + payment_id)
    const expected = crypto
      .createHmac("sha256", key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Idempotent: if already paid, just return active plan
    if (order.status === "paid") {
      const { data: act } = await db
        .from("customer_plans")
        .select("plan_id")
        .eq("customer_id", me.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      return NextResponse.json({ ok: true, active_plan_id: act?.plan_id ?? order.plan_id });
    }

    // Mark order as paid
    await db
      .from("orders")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", order.id);

    // Activate/upgrade customer plan: cancel any existing active rows, then insert new active
    await db
      .from("customer_plans")
      .update({ status: "cancelled", ended_at: new Date().toISOString() })
      .eq("customer_id", order.customer_id)
      .eq("status", "active");

    await db.from("customer_plans").insert({
      customer_id: order.customer_id,
      plan_id: order.plan_id,
      status: "active",
    });

    return NextResponse.json({ ok: true, active_plan_id: order.plan_id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
