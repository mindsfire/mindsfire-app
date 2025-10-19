import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/roles";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

async function resolveProfileIdByClerkId(db: ReturnType<typeof getSupabaseAdmin>, clerkId: string) {
  const { data, error } = await db
    .from("profiles")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id as string | undefined;
}

type Body = {
  customer_clerk_id: string;
  primary_va_clerk_id: string;
  secondary_va_clerk_id?: string | null;
  notes?: string | null;
};

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["admin", "manager", "team_lead"]);
    const { customer_clerk_id, primary_va_clerk_id, secondary_va_clerk_id, notes }: Body = await req.json();
    if (!customer_clerk_id || !primary_va_clerk_id) return bad("customer_clerk_id and primary_va_clerk_id are required");

    const db = getSupabaseAdmin();

    const customerId = await resolveProfileIdByClerkId(db, customer_clerk_id);
    const primaryId = await resolveProfileIdByClerkId(db, primary_va_clerk_id);
    const secondaryId = secondary_va_clerk_id ? await resolveProfileIdByClerkId(db, secondary_va_clerk_id) : null;

    if (!customerId) return bad("Customer profile not found");
    if (!primaryId) return bad("Primary VA profile not found");

    // Deactivate existing active assignment for this customer
    const { error: deactErr } = await db
      .from("va_assignments")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("customer_profile_id", customerId)
      .eq("active", true);
    if (deactErr) return bad(deactErr.message, 500);

    // Insert new active assignment
    const actorProfileId = await resolveProfileIdByClerkId(db, actor.userId);
    const { error: insErr } = await db
      .from("va_assignments")
      .insert({
        customer_profile_id: customerId,
        primary_va_profile_id: primaryId,
        secondary_va_profile_id: secondaryId,
        assigned_by_profile_id: actorProfileId ?? null,
        notes: notes ?? null,
        active: true,
      });

    if (insErr && insErr.message.includes("insert or update on table \"va_assignments\"")) {
      return bad("Constraint error while creating assignment: " + insErr.message, 400);
    }
    if (insErr) return bad(insErr.message, 500);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
