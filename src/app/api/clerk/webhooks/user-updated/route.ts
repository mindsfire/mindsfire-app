import { NextResponse } from "next/server";

// Placeholder for future syncs (e.g., mirror name/email/role to DB)
export async function POST(req: Request) {
  try {
    await req.json();
    // No-op for now. You can parse and upsert into your profiles table here.
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = (typeof err === "object" && err !== null && "message" in err)
      ? String((err as { message?: string }).message || "Internal error")
      : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
