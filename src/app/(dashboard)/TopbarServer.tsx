import TopbarClient from "./TopbarClient";
import { currentUser } from "@clerk/nextjs/server";

function computeInitials(name?: string | null, email?: string | null, first?: string | null, last?: string | null) {
  const fn = first?.trim();
  const ln = last?.trim();
  if (fn || ln) return `${fn?.[0] ?? ''}${ln?.[0] ?? ''}`.toUpperCase() || '';
  const n = (name ?? '').trim();
  if (n) {
    const parts = n.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }
  const ep = (email ?? '').split('@')[0] ?? '';
  if (ep) {
    const parts = ep.replace(/[._-]+/g, ' ').split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return ep.slice(0, 2).toUpperCase();
  }
  return '';
}

export default async function TopbarServer() {
  const u = await currentUser();
  const first_name: string | undefined = (u?.firstName as string) || undefined;
  const last_name: string | undefined = (u?.lastName as string) || undefined;
  const email: string | undefined = (u?.emailAddresses?.[0]?.emailAddress as string) || undefined;
  const name: string | undefined = u ? `${u.firstName ?? ""}${u.lastName ? " " + u.lastName : ""}`.trim() || undefined : undefined;

  const initials = computeInitials(name, email, first_name, last_name);
  return <TopbarClient initials={initials} name={name} email={email} />;
}
