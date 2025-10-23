import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Secured webhook: verifies signature and sets default role = "customer" on user.created
// Configure in Clerk Dashboard -> Webhooks -> user.created

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Optional health check (Clerk may not call GET, but useful for manual checks)
export async function GET() {
  return NextResponse.json({ ok: true, info: "user-created webhook is up" });
}

export async function POST(req: Request) {
  try {
    const secret = process.env.CLERK_USER_CREATED_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Missing CLERK_USER_CREATED_WEBHOOK_SECRET" }, { status: 500 });
    }

    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");
    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
    }

    const payload = await req.text();
    const wh = new Webhook(secret);
    let verified: unknown;
    try {
      verified = wh.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const evt = verified as {
      type?: string;
      data?: {
        id?: string;
        email_addresses?: Array<{ id?: string; email_address?: string }>;
        primary_email_address_id?: string;
        first_name?: string | null;
        last_name?: string | null;
        username?: string | null;
        external_id?: string | null;
      };
    };
    const type = evt?.type;
    const data = evt?.data;
    if (type !== "user.created") {
      return NextResponse.json({ ok: true });
    }

    const userId: string | undefined = data?.id;
    if (!userId) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    const client = await clerkClient();
    await client.users.updateUser(userId, { privateMetadata: { role: "customer" } });

    // Determine primary email and display name from event payload; fallback to Clerk API if needed
    let email: string | null = null;
    let displayName: string | null = null;
    const emails = evt?.data?.email_addresses ?? [];
    const primaryId = evt?.data?.primary_email_address_id;
    if (emails.length) {
      const primary = emails.find((e) => e.id === primaryId) ?? emails[0];
      email = (primary?.email_address ?? null) as string | null;
    }
    if (!email) {
      try {
        const u = await client.users.getUser(userId);
        email = (u?.emailAddresses?.[0]?.emailAddress as string) ?? null;
        displayName = (u?.fullName as string) ?? null;
      } catch {}
    }
    if (!displayName) {
      const first = (evt?.data?.first_name ?? undefined) as string | undefined;
      const last = (evt?.data?.last_name ?? undefined) as string | undefined;
      if (first || last) displayName = [first, last].filter(Boolean).join(" ");
    }

    // Seed profiles row for this user in Supabase (clerk_id + required email if present)
    const db = getSupabaseAdmin();
    await db
      .from("profiles")
      .upsert(
        { clerk_id: userId, email: email, display_name: displayName, created_at: new Date().toISOString() },
        { onConflict: "clerk_id" }
      );

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = (typeof err === "object" && err !== null && "message" in err)
      ? String((err as { message?: string }).message || "Internal error")
      : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
