import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Light in-memory rate limit (per process)
const RL_WINDOW_MS = 10_000;
const RL_MAX = 5;
const rlStore = new Map<string, number[]>();

function secondsBetween(a: Date, b: Date) {
  return Math.max(0, (b.getTime() - a.getTime()) / 1000);
}

/*
  GET /api/billing/usage-summary
  Returns current cycle usage and overage for the authenticated customer.
*/
export async function GET(_req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limit
    const nowMs = Date.now();
    const key = `us:${userId}`;
    const arr = (rlStore.get(key) ?? []).filter((t) => nowMs - t < RL_WINDOW_MS);
    if (arr.length >= RL_MAX) {
      return NextResponse.json({ error: "Too many requests, slow down" }, { status: 429 });
    }
    arr.push(nowMs);
    rlStore.set(key, arr);

    const db = getSupabaseAdmin();

    // Resolve current user profile id
    const { data: me, error: meErr } = await db
      .from("profiles")
      .select("id")
      .eq("clerk_id", userId)
      .single();
    if (meErr || !me) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    // Active plan for current period
    const { data: plan } = await db
      .from("customer_plans")
      .select("id, plan_id, started_at, expires_at, included_hours, rollover_hours_applied, addl_hourly_rate_snapshot")
      .eq("customer_id", me.id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!plan) return NextResponse.json({ error: "No active plan" }, { status: 404 });

    const windowStart = new Date(plan.started_at);
    const windowEnd = plan.expires_at ? new Date(plan.expires_at) : new Date();
    const now = new Date();
    const effectiveEnd = now < windowEnd ? now : windowEnd;

    // Fetch task ids for this customer
    const { data: tasks } = await db
      .from("tasks")
      .select("id")
      .eq("customer_id", me.id);
    const taskIds = (tasks ?? []).map((t: { id: string }) => t.id);

    let usedSeconds = 0;
    if (taskIds.length) {
      // Fetch logs in window for these tasks
      const { data: logs } = await db
        .from("task_work_logs")
        .select("task_id, action, at")
        .in("task_id", taskIds)
        .gte("at", windowStart.toISOString())
        .lte("at", windowEnd.toISOString())
        .order("task_id", { ascending: true })
        .order("at", { ascending: true });

      // Aggregate per task: pair start/resume -> pause/complete; clamp to [windowStart, effectiveEnd]
      let currentTask: string | null = null;
      let running = false;
      let runStart: Date | null = null;

      const flushIfRunning = () => {
        if (running && runStart) {
          usedSeconds += secondsBetween(runStart, effectiveEnd);
          running = false;
          runStart = null;
        }
      };

      const rows = logs ?? [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i] as { task_id: string; action: string; at: string };
        const at = new Date(r.at);
        if (currentTask !== r.task_id) {
          // switch task: flush prior
          flushIfRunning();
          currentTask = r.task_id;
          running = false;
          runStart = null;
        }
        if ((r.action === "start" || r.action === "resume") && !running) {
          const startAt = at < windowStart ? windowStart : at;
          if (startAt < effectiveEnd) {
            running = true;
            runStart = startAt;
          }
        } else if ((r.action === "pause" || r.action === "complete") && running && runStart) {
          const endAt = at > effectiveEnd ? effectiveEnd : at;
          if (endAt > runStart) usedSeconds += secondsBetween(runStart, endAt);
          running = false;
          runStart = null;
        }
      }
      // End of dataset: flush last task if still running
      flushIfRunning();
    }

    const usedHours = usedSeconds / 3600;
    const pool = Number(plan.included_hours ?? 0) + Number(plan.rollover_hours_applied ?? 0);
    const remaining = Math.max(0, pool - usedHours);
    const overageHours = Math.max(0, usedHours - pool);
    const addlRate = Number(plan.addl_hourly_rate_snapshot ?? 0);
    const overageCost = overageHours * addlRate;

    const daysLeft = Math.max(0, Math.ceil((windowEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return NextResponse.json({
      ok: true,
      period: { start: windowStart.toISOString(), end: windowEnd.toISOString(), days_left: daysLeft },
      usage: {
        included_hours: Number(plan.included_hours ?? 0),
        rollover_hours_applied: Number(plan.rollover_hours_applied ?? 0),
        used_hours: Number(usedHours.toFixed(2)),
        remaining_hours: Number(remaining.toFixed(2)),
        overage_hours: Number(overageHours.toFixed(2)),
        addl_hourly_rate: Number(addlRate.toFixed(2)),
        overage_cost_usd: Number(overageCost.toFixed(2)),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
