import { NextResponse } from "next/server";
import { requireRole, AllowedRoles, Role } from "@/src/lib/auth/roles";
import { Clerk } from "@clerk/clerk-sdk-node";

const clerk = new Clerk({ apiKey: process.env.CLERK_SECRET_KEY! });

type Body = { userId: string; role: Role };

export async function POST(req: Request) {
  try {
    await requireRole(["admin"]);

    const body = (await req.json()) as Partial<Body>;
    const userId = body.userId?.trim();
    const role = body.role as Role;

    if (!userId || !role || !AllowedRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await clerk.users.updateUser(userId, {
      privateMetadata: { role },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const msg = err?.message || "Internal error";
    const code = msg === "Unauthenticated" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
