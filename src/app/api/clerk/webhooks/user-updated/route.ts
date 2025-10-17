import { NextResponse } from "next/server";

// Placeholder for future syncs (e.g., mirror name/email/role to DB)
export async function POST(req: Request) {
  try {
    const _payload = await req.json();
    // No-op for now. You can parse and upsert into your profiles table here.
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
