import { NextResponse } from "next/server";
import { requireRole, AllowedRoles, Role } from "@/lib/auth/roles";
import { clerkClient } from "@clerk/nextjs/server";

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

    const client = await clerkClient();
    await client.users.updateUser(userId, {
      privateMetadata: { role },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = (typeof err === "object" && err !== null && "message" in err)
      ? String((err as { message?: string }).message || "Internal error")
      : "Internal error";
    const code = msg === "Unauthenticated" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
