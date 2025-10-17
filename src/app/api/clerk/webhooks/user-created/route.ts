import { NextResponse } from "next/server";
import { Clerk } from "@clerk/clerk-sdk-node";
import { Webhook } from "svix";

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
    let evt: any;
    try {
      evt = wh.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch (e: any) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const type = evt?.type as string | undefined;
    const data = evt?.data as Record<string, any> | undefined;
    if (type !== "user.created") {
      return NextResponse.json({ ok: true });
    }

    const userId: string | undefined = data?.id;
    if (!userId) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    const clerk = new Clerk({ apiKey: process.env.CLERK_SECRET_KEY! });
    await clerk.users.updateUser(userId, {
      privateMetadata: { role: "customer" },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
