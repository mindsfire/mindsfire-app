import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function verifySignature(bodyRaw: string, signature: string | null, secret: string) {
  if (!signature) return false;
  try {
    const digestHex = crypto.createHmac("sha256", secret).update(bodyRaw, "utf8").digest("hex");
    const a = Buffer.from(digestHex, "hex");
    const b = Buffer.from(signature, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing RAZORPAY_WEBHOOK_SECRET" }, { status: 500 });
  }

  const bodyRaw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  // Verify webhook signature
  const ok = verifySignature(bodyRaw, signature, webhookSecret);
  if (!ok) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

  const payload = JSON.parse(bodyRaw);
  const event = payload?.event as string | undefined;

  // Extract order_id from known events
  // payment.captured => payload.payment.entity.order_id
  // order.paid       => payload.order.entity.id
  const orderId: string | undefined = payload?.payload?.payment?.entity?.order_id || payload?.payload?.order?.entity?.id;
  if (!orderId) {
    return NextResponse.json({ error: "order_id not found in webhook" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Update order row idempotently
  const { data: orderRow, error: selErr } = await db
    .from("orders")
    .select("id, customer_id, plan_id, status, purpose")
    .eq("razorpay_order_id", orderId)
    .single();

  if (selErr || !orderRow) {
    // Unknown order - store raw for inspection
    await db.from("audit_logs").insert({
      actor_id: null,
      action: "razorpay_webhook_unknown_order",
      entity_type: "order",
      entity_id: null,
      meta: { orderId, event },
    });
    return NextResponse.json({ ok: true });
  }

  // If already paid, do nothing (idempotent)
  if (orderRow.status === "paid") return NextResponse.json({ ok: true });

  // Mark as paid on success events
  const success = event === "payment.captured" || event === "order.paid";
  const newStatus = success ? "paid" : "failed";
  const paymentId: string | undefined = payload?.payload?.payment?.entity?.id;

  const { error: updErr } = await db
    .from("orders")
    .update({
      status: newStatus,
      paid_at: success ? new Date().toISOString() : null,
      razorpay_payment_id: paymentId ?? null,
      raw: payload,
    })
    .eq("razorpay_order_id", orderId);
  if (updErr) return NextResponse.json({ error: "Failed to update order" }, { status: 500 });

  if (success && orderRow.purpose === 'plan') {
    // Prepare plan snapshot details
    const { data: planRow } = await db
      .from("plans")
      .select("id,name,quota_hours,features")
      .eq("id", orderRow.plan_id)
      .single();

    const startedAt = new Date();
    const expiresAt = new Date(startedAt);
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    const quotaHoursSnapshot = planRow?.quota_hours ?? null;
    const includedHours = planRow?.quota_hours ?? 0;
    const hourlyRate = Number((planRow?.features as any)?.hourly_rate ?? 0);
    const addlHourlyRate = Number((planRow?.features as any)?.additional_hourly_rate ?? 0);
    const name = (planRow?.name || '').toLowerCase();
    const map: Record<string, number> = { 'essential': 20, 'pro': 20, 'pro max': 25, 'scale': 25 };
    const rolloverFromName = Object.keys(map).find(k => name === k) ? map[name] : 0;
    const rolloverPercentSnapshot = typeof (planRow as any)?.features?.rollover_percent === 'number'
      ? (planRow as any).features.rollover_percent as number
      : rolloverFromName;
    // Determine current active plan (if any)
    const { data: activeRows } = await db
      .from("customer_plans")
      .select("id, plan_id")
      .eq("customer_id", orderRow.customer_id)
      .eq("status", "active")
      .limit(1);

    const active = activeRows?.[0] ?? null;

    if (!active) {
      // First-time activation (handle unique-conflict races) with snapshots
      const { error: insErr } = await db.from("customer_plans").insert({
        customer_id: orderRow.customer_id,
        plan_id: orderRow.plan_id,
        status: "active",
        period: 'monthly',
        expires_at: expiresAt.toISOString(),
        quota_hours_snapshot: quotaHoursSnapshot,
        rollover_percent_snapshot: rolloverPercentSnapshot,
        included_hours: includedHours,
        hourly_rate_snapshot: hourlyRate,
        addl_hourly_rate_snapshot: addlHourlyRate,
        rollover_hours_applied: 0,
      });
      if (insErr) {
        const code = (insErr as { code?: string }).code;
        if (code === "23505") {
          // Another process inserted active; continue
        } else {
          return NextResponse.json({ error: "Failed to activate plan" }, { status: 500 });
        }
      }
      await db.from("audit_logs").insert({
        actor_id: orderRow.customer_id,
        action: "plan_purchase",
        entity_type: "order",
        entity_id: orderRow.id,
        meta: { orderId },
      });
    } else if (active.plan_id !== orderRow.plan_id) {
      // Upgrade/downgrade: end current and activate new
      await db
        .from("customer_plans")
        .update({ status: "cancelled", ended_at: new Date().toISOString() })
        .eq("id", active.id);

      const { error: insErr2 } = await db.from("customer_plans").insert({
        customer_id: orderRow.customer_id,
        plan_id: orderRow.plan_id,
        status: "active",
        period: 'monthly',
        expires_at: expiresAt.toISOString(),
        quota_hours_snapshot: quotaHoursSnapshot,
        rollover_percent_snapshot: rolloverPercentSnapshot,
        included_hours: includedHours,
        hourly_rate_snapshot: hourlyRate,
        addl_hourly_rate_snapshot: addlHourlyRate,
        rollover_hours_applied: 0,
      });
      if (insErr2) {
        const code2 = (insErr2 as { code?: string }).code;
        if (code2 === "23505") {
          // Another process inserted active; continue
        } else {
          return NextResponse.json({ error: "Failed to activate upgraded plan" }, { status: 500 });
        }
      }

      await db.from("audit_logs").insert({
        actor_id: orderRow.customer_id,
        action: "plan_upgrade",
        entity_type: "order",
        entity_id: orderRow.id,
        meta: { orderId, from_plan_id: active.plan_id, to_plan_id: orderRow.plan_id },
      });
    } else {
      // Same plan re-purchase: renewal audit
      await db.from("audit_logs").insert({
        actor_id: orderRow.customer_id,
        action: "plan_renewal",
        entity_type: "order",
        entity_id: orderRow.id,
        meta: { orderId, plan_id: orderRow.plan_id },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
