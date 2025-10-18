import { supabaseServer } from "@/lib/supabaseServer";
import ActiveSessionsCardClient from "./ActiveSessionsCardClient";

export default async function ActiveSessionsCardServer() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return <ActiveSessionsCardClient initialSessions={[]} />;
  }

  const { data } = await supabase
    .from("user_sessions")
    .select("id, session_key, label, created_at, last_seen_at, revoked_at")
    .eq("user_id", user.id)
    .order("last_seen_at", { ascending: false });

  type DbSession = {
    id: string;
    session_key: string;
    label: string;
    created_at: string;
    last_seen_at: string;
    revoked_at: string | null;
  };

  const initialSessions: DbSession[] = ((data ?? []) as DbSession[]).filter((r) => !r.revoked_at);

  return <ActiveSessionsCardClient initialSessions={initialSessions} />;
}
