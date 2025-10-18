import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { clerkClient } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["US", "GB", "DE", "AU", "AE", "IN"]);

type Body = {
  phone_e164?: string | null;
  country_code?: string | null;
  region?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { phone_e164, country_code, region } = (await req.json()) as Body;

    // Basic normalization
    const cc = country_code?.toUpperCase() ?? null;
    if (cc && !ALLOWED.has(cc)) {
      return NextResponse.json({ error: "Invalid country_code" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Try to include email for first-time inserts where email may be NOT NULL
    let email: string | null = null;
    try {
      const client = await clerkClient();
      const u = await client.users.getUser(userId);
      email = (u?.emailAddresses?.[0]?.emailAddress as string) ?? null;
    } catch {}
    const { error } = await admin
      .from("profiles")
      .upsert({
        clerk_id: userId,
        phone_e164: phone_e164 ?? null,
        country_code: cc,
        region: region ?? null,
        email: email,
        updated_at: new Date().toISOString(),
      }, { onConflict: "clerk_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
