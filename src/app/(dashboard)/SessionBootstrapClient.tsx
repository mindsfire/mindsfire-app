"use client";

import { useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getSessionKey } from "@/lib/sessionKey";

export default function SessionBootstrapClient() {
  const myKey = useMemo(() => getSessionKey(), []);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let bcUnsub: (() => void) | null = null;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      // Upsert current device session
      await supabase.from("user_sessions").upsert(
        {
          user_id: user.id,
          session_key: myKey,
          label: "Web",
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
          last_seen_at: new Date().toISOString(),
          revoked_at: null,
        },
        { onConflict: "user_id,session_key" }
      );

      // Find my row; if revoked, reactivate it now
      const { data: row } = await supabase
        .from("user_sessions")
        .select("id, revoked_at")
        .eq("user_id", user.id)
        .eq("session_key", myKey)
        .maybeSingle();

      if (row?.revoked_at) {
        await supabase
          .from("user_sessions")
          .update({ revoked_at: null, created_at: new Date().toISOString(), last_seen_at: new Date().toISOString() })
          .eq("id", row.id);
      }

      // Notify other devices to refresh session list immediately
      await supabase
        .channel(`user:${user.id}`)
        .send({ type: 'broadcast', event: 'session-upsert', payload: { session_key: myKey } });

      if (row && !row.revoked_at) {
        const channel = supabase
          .channel("user_sessions_revokes_bootstrap")
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "user_sessions", filter: `id=eq.${row.id}` },
            async (payload) => {
              const next = payload.new as { revoked_at: string | null };
              if (next.revoked_at) {
                await supabase.auth.signOut();
              }
            }
          )
          .subscribe();
        unsub = () => {
          try { channel.unsubscribe(); } catch {}
        };

        // Also subscribe to a user-level broadcast channel for immediate revokes
        const bc = supabase
          .channel(`user:${user.id}`)
          .on('broadcast', { event: 'revoke-session' }, async (payload: { payload?: { session_key?: string } }) => {
            const { session_key } = payload?.payload || {};
            if (session_key && session_key === myKey) {
              await supabase.auth.signOut();
            }
          })
          .subscribe();
        bcUnsub = () => {
          try { bc.unsubscribe(); } catch {}
        };
      }

      // Optional: heartbeat update (last_seen_at)
      const timer = setInterval(async () => {
        await supabase
          .from("user_sessions")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("session_key", myKey);
      }, 120000); // 2 minutes

      // Polling fallback: check revoked_at periodically in case Realtime is disabled
      pollTimer = setInterval(async () => {
        const { data: me } = await supabase
          .from("user_sessions")
          .select("revoked_at")
          .eq("user_id", user.id)
          .eq("session_key", myKey)
          .maybeSingle();
        if (me?.revoked_at) {
          await supabase.auth.signOut();
        }
      }, 30000); // 30s

      return () => {
        clearInterval(timer);
        if (pollTimer) clearInterval(pollTimer);
        if (unsub) unsub();
        if (bcUnsub) bcUnsub();
      };
    })();
  }, [myKey]);

  return null;
}
