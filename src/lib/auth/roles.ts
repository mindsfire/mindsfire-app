import { auth, currentUser } from "@clerk/nextjs/server";

export const AllowedRoles = [
  "customer",
  "va",
  "team_lead",
  "manager",
  "admin",
] as const;

export type Role = (typeof AllowedRoles)[number];

export async function requireRole(allowed: Role[]) {
  const { userId } = auth();
  if (!userId) {
    throw new Error("Unauthenticated");
  }
  const user = await currentUser();
  const role = ((user?.privateMetadata?.role as string) || "customer") as Role;
  if (!allowed.includes(role)) {
    throw new Error("Forbidden");
  }
  return { userId, role };
}
