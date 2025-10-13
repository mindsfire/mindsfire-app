import TopbarClient from "./TopbarClient";
import { supabaseServer } from "@/lib/supabaseServer";

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
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const u = data.user;

  let name: string | undefined = (u?.user_metadata?.full_name as string) || undefined;
  let email: string | undefined = u?.email || undefined;
  let first_name: string | undefined;
  let last_name: string | undefined;

  if (u?.id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("first_name, last_name, name, email")
      .eq("id", u.id)
      .maybeSingle();
    name = prof?.name ?? name;
    email = prof?.email ?? email;
    first_name = prof?.first_name ?? undefined;
    last_name = prof?.last_name ?? undefined;
  }

  const initials = computeInitials(name, email, first_name, last_name);
  return <TopbarClient initials={initials} name={name} email={email} />;
}
