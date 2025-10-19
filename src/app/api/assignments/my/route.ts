import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/roles";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";

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

export async function GET() {
  try {
    await requireRole(["va"]);
    const { userId } = await auth();
    if (!userId) return bad("Unauthenticated", 401);

    const db = getSupabaseAdmin();
    const vaId = await resolveProfileIdByClerkId(db, userId);
    if (!vaId) return bad("VA profile not found", 404);

    const { data, error } = await db
      .from("va_assignments")
      .select("id, customer_profile_id, primary_va_profile_id, secondary_va_profile_id, notes, created_at, updated_at")
      .eq("active", true)
      .or(`primary_va_profile_id.eq.${vaId},secondary_va_profile_id.eq.${vaId}`);

    if (error) return bad(error.message, 500);
    return NextResponse.json({ assignments: data ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
