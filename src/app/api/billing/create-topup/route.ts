import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Razorpay from "razorpay";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Light in-memory rate limit (per process): 5 requests / 10s per user
const RL_WINDOW_MS = 10_000;
const RL_MAX = 5;
const rlStore = new Map<string, number[]>();

/*
  POST /api/billing/create-topup
  Body: {
    hours: number  // number of additional hours to top up (e.g., 5)
  }
  Creates a Razorpay order for additional hours at the current cycle's additional hourly rate.
*/
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limit
    const now = Date.now();
    const key = `ct:${userId}`;
    const arr = (rlStore.get(key) ?? []).filter((t) => now - t < RL_WINDOW_MS);
    if (arr.length >= RL_MAX) {
      return NextResponse.json({ error: "Too many requests, slow down" }, { status: 429 });
    }
    arr.push(now);
    rlStore.set(key, arr);

    const parsed = (await req.json().catch(() => ({}))) as Partial<{ hours: number }>;
    const hours = Number(parsed.hours);
    if (!hours || !isFinite(hours) || hours <= 0) {
      return NextResponse.json({ error: "Provide a positive number of hours" }, { status: 400 });
    }

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      return NextResponse.json({ error: "Missing Razorpay keys" }, { status: 500 });
    }

    const db = getSupabaseAdmin();

    // Resolve current user profile id
    const { data: me, error: meErr } = await db
      .from("profiles")
      .select("id")
      .eq("clerk_id", userId)
      .single();
    if (meErr || !me) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    // Fetch active plan row + plan details for current cycle
    const { data: activePlan } = await db
      .from("customer_plans")
      .select("plan_id, addl_hourly_rate_snapshot, expires_at")
      .eq("customer_id", me.id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activePlan) {
      return NextResponse.json({ error: "No active plan to top up" }, { status: 400 });
    }

    // Determine additional hourly rate from snapshot, or fallback to plan.features
    let addlRate = Number(activePlan.addl_hourly_rate_snapshot ?? 0);
    if (!addlRate || !isFinite(addlRate) || addlRate <= 0) {
      const { data: planRow } = await db
        .from("plans")
        .select("features")
        .eq("id", activePlan.plan_id)
        .single();
      type PlanFeatures = { additional_hourly_rate?: number };
      const featuresUnknown = (planRow?.features ?? null) as unknown;
      const features: PlanFeatures | null =
        featuresUnknown && typeof featuresUnknown === "object" ? (featuresUnknown as PlanFeatures) : null;
      const fallback = Number(features?.additional_hourly_rate ?? 0);
      addlRate = isFinite(fallback) && fallback > 0 ? fallback : 0;
    }
    if (addlRate <= 0) {
      return NextResponse.json({ error: "Additional hourly rate is not configured" }, { status: 500 });
    }

    const amountUsd = addlRate * hours; // USD major units
    const amountSubunits = Math.round(amountUsd * 100); // cents

    const razorpay = new Razorpay({ key_id, key_secret });
    // Build a compact receipt: topup_<8-digit time>_<6id>
    const ts8 = Date.now().toString().slice(-8);
    const cust6 = String(me.id || "c").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
    const receipt = `topup_${ts8}_${cust6}`.slice(0, 40);

    const order = await razorpay.orders.create({
      amount: amountSubunits,
      currency: "USD",
      receipt,
    });

    // Persist order with purpose='topup'
    const { data: ins, error: insErr } = await db
      .from("orders")
      .insert({
        customer_id: me.id,
        plan_id: activePlan.plan_id,
        amount: amountSubunits,
        currency: "USD",
        status: "pending",
        razorpay_order_id: order.id,
        raw: { hours, addlRate, expires_at: activePlan.expires_at },
        purpose: "topup",
      })
      .select("id")
      .single();

    if (insErr || !ins) return NextResponse.json({ error: "Failed to create order" }, { status: 500 });

    return NextResponse.json({
      ok: true,
      internalOrderId: ins.id,
      razorpay: {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      description: `Top-up ${hours}h @ $${addlRate.toFixed(2)}/h (USD)`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
