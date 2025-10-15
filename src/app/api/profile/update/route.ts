import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const ALLOWED = new Set(["US", "GB", "DE", "AU", "AE", "IN"]);

type Body = {
  phone_e164?: string | null;
  country_code?: string | null;
  region?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 401 });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { phone_e164, country_code, region } = (await req.json()) as Body;

    // Basic normalization
    const cc = country_code?.toUpperCase() ?? null;
    if (cc && !ALLOWED.has(cc)) {
      return NextResponse.json({ error: "Invalid country_code" }, { status: 400 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        phone_e164: phone_e164 ?? null,
        country_code: cc,
        region: region ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
