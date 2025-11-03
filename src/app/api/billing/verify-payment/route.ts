import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Light in-memory rate limit (per process)
const RL_WINDOW_MS = 10_000;
const RL_MAX = 5;
const rlStore = new Map<string, number[]>();

function secondsBetween(a: Date, b: Date) {
  return Math.max(0, (b.getTime() - a.getTime()) / 1000);
}

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

    // Rate limit per user
    const now = Date.now();
    const key = `vp:${userId}`;
    const arr = (rlStore.get(key) ?? []).filter((t) => now - t < RL_WINDOW_MS);
    if (arr.length >= RL_MAX) {
      return NextResponse.json({ error: "Too many requests, slow down" }, { status: 429 });
    }
    arr.push(now);
    rlStore.set(key, arr);

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
      .select("id, customer_id, plan_id, status, razorpay_order_id, razorpay_payment_id, purpose")
      .eq("id", internalOrderId)
      .single();
    if (ordErr || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.customer_id !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Normalize row with typing for TS
    type OrderRow = {
      id: string;
      customer_id: string;
      plan_id: string;
      status: string;
      razorpay_order_id: string;
      razorpay_payment_id?: string | null;
      purpose: string;
    };
    const ord = order as OrderRow;

    // Cross-check Razorpay order IDs
    if (ord.razorpay_order_id !== razorpay_order_id) {
      return NextResponse.json({ error: "Order mismatch" }, { status: 400 });
    }

    // Verify signature: sha256(order_id + '|' + payment_id) using timing-safe compare
    const expectedHex = crypto
      .createHmac("sha256", key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    try {
      const a = Buffer.from(expectedHex, "hex");
      const b = Buffer.from(razorpay_signature, "hex");
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Idempotent: if already paid, ensure payment id is stored and just return active plan
    if (ord.status === "paid") {
      if (!ord.razorpay_payment_id) {
        await db
          .from("orders")
          .update({ razorpay_payment_id })
          .eq("id", ord.id);
      }
      const { data: act } = await db
        .from("customer_plans")
        .select("plan_id")
        .eq("customer_id", me.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      return NextResponse.json({ ok: true, active_plan_id: act?.plan_id ?? ord.plan_id });
    }

    // Mark order as paid
    await db
      .from("orders")
      .update({ status: "paid", paid_at: new Date().toISOString(), razorpay_payment_id })
      .eq("id", ord.id);

    // If this is a plan purchase, activate/upgrade customer plan
    if (ord.purpose !== 'plan') {
      return NextResponse.json({ ok: true });
    }

    // Compute rollover carry-forward from previous active (if any)
    const { data: prevActive } = await db
      .from("customer_plans")
      .select("id, started_at, expires_at, included_hours, rollover_hours_applied, rollover_percent_snapshot")
      .eq("customer_id", ord.customer_id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch plan snapshot details
    const { data: planRow } = await db
      .from("plans")
      .select("id,name,quota_hours,features")
      .eq("id", ord.plan_id)
      .single();

    const startedAt = new Date();
    const expiresAt = new Date(startedAt);
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    const quotaHoursSnapshot = planRow?.quota_hours ?? null;
    const includedHours = planRow?.quota_hours ?? 0;
    const hourlyRate = Number((planRow?.features as any)?.hourly_rate ?? 0);
    const addlHourlyRate = Number((planRow?.features as any)?.additional_hourly_rate ?? 0);
    // Determine rollover percent based on plan or features
    const name = (planRow?.name || '').toLowerCase();
    const map: Record<string, number> = { 'essential': 20, 'pro': 20, 'pro max': 25, 'scale': 25 };
    const rolloverFromName = Object.keys(map).find(k => name === k) ? map[name] : 0;
    const rolloverPercentSnapshot = typeof planRow?.features?.rollover_percent === 'number'
      ? planRow?.features?.rollover_percent as unknown as number
      : rolloverFromName;

    // Calculate carry-forward from previous cycle usage if there was a previous active plan
    let rolloverApplied = 0;
    if (prevActive?.started_at && prevActive?.included_hours != null) {
      const windowStart = new Date(prevActive.started_at as unknown as string);
      const windowEnd = prevActive.expires_at ? new Date(prevActive.expires_at as unknown as string) : new Date();

      // Fetch task ids for this customer
      const { data: tasks } = await db.from("tasks").select("id").eq("customer_id", ord.customer_id);
      const taskIds = (tasks ?? []).map((t: any) => t.id);
      let usedSeconds = 0;
      if (taskIds.length) {
        const { data: logs } = await db
          .from("task_work_logs")
          .select("task_id, action, at")
          .in("task_id", taskIds)
          .gte("at", windowStart.toISOString())
          .lte("at", windowEnd.toISOString())
          .order("task_id", { ascending: true })
          .order("at", { ascending: true });

        let currentTask: string | null = null;
        let running = false;
        let runStart: Date | null = null;
        const flushIfRunning = () => {
          if (running && runStart) {
            usedSeconds += secondsBetween(runStart, windowEnd);
            running = false;
            runStart = null;
          }
        };
        const rows = logs ?? [];
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i] as { task_id: string; action: string; at: string };
          const at = new Date(r.at);
          if (currentTask !== r.task_id) {
            flushIfRunning();
            currentTask = r.task_id;
            running = false;
            runStart = null;
          }
          if ((r.action === "start" || r.action === "resume") && !running) {
            const startAt = at < windowStart ? windowStart : at;
            if (startAt < windowEnd) { running = true; runStart = startAt; }
          } else if ((r.action === "pause" || r.action === "complete") && running && runStart) {
            const endAt = at > windowEnd ? windowEnd : at;
            if (endAt > runStart) usedSeconds += secondsBetween(runStart, endAt);
            running = false;
            runStart = null;
          }
        }
        flushIfRunning();
      }
      const usedHoursPrev = usedSeconds / 3600;
      const poolPrev = Number(prevActive.included_hours ?? 0) + Number(prevActive.rollover_hours_applied ?? 0);
      const remainingPrev = Math.max(0, poolPrev - usedHoursPrev);
      const maxCarry = Math.floor(Number(prevActive.included_hours ?? 0) * Number(prevActive.rollover_percent_snapshot ?? 0) / 100);
      rolloverApplied = Math.min(remainingPrev, maxCarry);
    }

    // Now cancel any existing active rows, then insert new active with rollover carry-forward
    await db
      .from("customer_plans")
      .update({ status: "cancelled", ended_at: new Date().toISOString() })
      .eq("customer_id", ord.customer_id)
      .eq("status", "active");

    // Insert new active plan, tolerate rare unique-conflict races
    const { error: insErr } = await db.from("customer_plans").insert({
      customer_id: ord.customer_id,
      plan_id: ord.plan_id,
      status: "active",
      period: 'monthly',
      expires_at: expiresAt.toISOString(),
      quota_hours_snapshot: quotaHoursSnapshot,
      rollover_percent_snapshot: rolloverPercentSnapshot,
      included_hours: includedHours,
      hourly_rate_snapshot: hourlyRate,
      addl_hourly_rate_snapshot: addlHourlyRate,
      rollover_hours_applied: rolloverApplied,
    });
    if (insErr) {
      // If unique constraint hit due to concurrent request, read the active row and return ok
      // Postgres unique_violation is 23505
      const code = (insErr as { code?: string }).code;
      if (code === "23505") {
        const { data: act } = await db
          .from("customer_plans")
          .select("plan_id")
          .eq("customer_id", ord.customer_id)
          .eq("status", "active")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return NextResponse.json({ ok: true, active_plan_id: act?.plan_id ?? ord.plan_id });
      }
      return NextResponse.json({ error: insErr.message ?? "Plan activation failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, active_plan_id: ord.plan_id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
