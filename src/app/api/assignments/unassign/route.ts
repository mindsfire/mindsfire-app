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

type Body = { customer_clerk_id: string };

export async function POST(req: Request) {
  try {
    await requireRole(["admin", "manager", "team_lead"]);
    const { customer_clerk_id }: Body = await req.json();
    if (!customer_clerk_id) return bad("customer_clerk_id is required");

    const db = getSupabaseAdmin();
    const customerId = await resolveProfileIdByClerkId(db, customer_clerk_id);
    if (!customerId) return bad("Customer profile not found");

    const { error } = await db
      .from("va_assignments")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("customer_profile_id", customerId)
      .eq("active", true);

    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
