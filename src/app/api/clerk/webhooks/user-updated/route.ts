import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { clerkClient } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Optional health check
export async function GET() {
  return NextResponse.json({ ok: true, info: "user-updated webhook is up" });
}

export async function POST(req: Request) {
  try {
    const secret = process.env.CLERK_USER_UPDATED_WEBHOOK_SECRET || process.env.CLERK_USER_CREATED_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Missing CLERK_USER_UPDATED_WEBHOOK_SECRET" }, { status: 500 });
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
      };
    };
    const type = evt?.type;
    if (type !== "user.updated") {
      return NextResponse.json({ ok: true });
    }

    const userId = evt?.data?.id;
    if (!userId) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

    // Extract email and display name
    let email: string | null = null;
    let displayName: string | null = null;
    const emails = evt?.data?.email_addresses ?? [];
    const primaryId = evt?.data?.primary_email_address_id;
    if (emails.length) {
      const primary = emails.find((e) => e.id === primaryId) ?? emails[0];
      email = (primary?.email_address ?? null) as string | null;
    }
    try {
      const client = await clerkClient();
      const u = await client.users.getUser(userId);
      if (!email) email = (u?.emailAddresses?.[0]?.emailAddress as string) ?? null;
      displayName = (u?.fullName as string) || displayName;
      if (!displayName) {
        const first = (evt?.data?.first_name ?? undefined) as string | undefined;
        const last = (evt?.data?.last_name ?? undefined) as string | undefined;
        if (first || last) displayName = [first, last].filter(Boolean).join(" ");
      }
    } catch {}

    const db = getSupabaseAdmin();
    const { error } = await db
      .from("profiles")
      .upsert(
        {
          clerk_id: userId,
          email: email,
          display_name: displayName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "clerk_id" }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = (typeof err === "object" && err !== null && "message" in err)
      ? String((err as { message?: string }).message || "Internal error")
      : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
