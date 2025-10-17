"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Globe, Monitor, Smartphone } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getSessionKey } from "@/lib/sessionKey";

type DbSession = {
  id: string;
  session_key: string;
  label: string;
  created_at: string;
  last_seen_at: string;
  revoked_at: string | null;
};

export default function ActiveSessionsCardClient({ initialSessions = [] as DbSession[] }: { initialSessions?: DbSession[] }) {
  const [sessions, setSessions] = useState<DbSession[]>(initialSessions);
  const [loading, setLoading] = useState(initialSessions.length === 0);
  const [blocking, setBlocking] = useState(false);
  const myKey = useMemo(() => getSessionKey(), []);
  const [, forceTick] = useReducer((x: number) => x + 1, 0);
  const prevCountRef = useRef(initialSessions.length);

  const fetchSessionsFor = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("user_sessions")
      .select("id, session_key, label, created_at, last_seen_at, revoked_at")
      .eq("user_id", userId)
      .order("last_seen_at", { ascending: false });
    const list = ((data ?? []) as DbSession[]).filter((r) => !r.revoked_at);
    setSessions(list);
    prevCountRef.current = list.length;
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("mf_sessions_cache", JSON.stringify(list));
      }
    } catch {}
  }, []);

  useEffect(() => {
    // If SSR didn't provide data, try hydrating from cache to avoid skeleton
    if (initialSessions.length === 0 && sessions.length === 0) {
      try {
        if (typeof window !== "undefined") {
          const raw = window.localStorage.getItem("mf_sessions_cache");
          if (raw) {
            const cached = JSON.parse(raw) as DbSession[];
            setSessions(cached);
            prevCountRef.current = cached.length;
            setLoading(false);
          }
        }
      } catch {}
    }
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setLoading(false);
        return;
      }

      await supabase.from("user_sessions").upsert(
        {
          user_id: user.id,
          session_key: myKey,
          label: "Web",
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "user_id,session_key" }
      );

      await fetchSessionsFor(user.id);

      // Subscribe to revoke updates for this device's row (if active)
      const { data: mineRow } = await supabase
        .from("user_sessions")
        .select("id, revoked_at")
        .eq("user_id", user.id)
        .eq("session_key", myKey)
        .maybeSingle();

      let revokeChan: ReturnType<typeof supabase.channel> | null = null;
      if (mineRow && !mineRow.revoked_at) {
        revokeChan = supabase
          .channel("user_sessions_revokes")
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "user_sessions", filter: `id=eq.${mineRow.id}` },
            async (payload) => {
              const next = payload.new as DbSession;
              if (next.revoked_at) {
                await supabase.auth.signOut();
              }
            }
          )
          .subscribe();
      }

      // Subscribe to user-level broadcast to refresh on other device login/reactivation
      const bc = supabase
        .channel(`user:${user.id}`)
        .on('broadcast', { event: 'session-upsert' }, async () => {
          await fetchSessionsFor(user.id);
        })
        .subscribe();

      setLoading(false);

      return () => {
        try { bc.unsubscribe(); } catch {}
        try { revokeChan?.unsubscribe(); } catch {}
      };
    })();
  }, [myKey, fetchSessionsFor, initialSessions.length, sessions.length]);

  // Re-render relative time every 30s
  useEffect(() => {
    const t = setInterval(() => forceTick(), 30000);
    return () => clearInterval(t);
  }, []);

  // Refetch on window focus and every 60s to keep list fresh
  useEffect(() => {
    let cleanup = () => {};
    let timer: ReturnType<typeof setInterval> | null = null;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      const onFocus = async () => { await fetchSessionsFor(user.id); };
      window.addEventListener("focus", onFocus);
      cleanup = () => window.removeEventListener("focus", onFocus);
      timer = setInterval(() => { fetchSessionsFor(user.id); }, 60000);
    })();
    return () => { cleanup(); if (timer) clearInterval(timer); };
  }, [fetchSessionsFor]);

  async function revoke(row: DbSession) {
    try {
      setBlocking(true);
      await supabase
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", row.id);

      // Send a broadcast to the user's channel so the target device can sign out immediately
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (user) {
        await supabase
          .channel(`user:${user.id}`)
          .send({ type: 'broadcast', event: 'revoke-session', payload: { session_key: row.session_key } });
      }

      if (row.session_key === myKey) {
        await supabase.auth.signOut();
        return;
      }

      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== row.id);
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem("mf_sessions_cache", JSON.stringify(next));
          }
        } catch {}
        return next;
      });
    } finally {
      setBlocking(false);
    }
  }

  function iconFor(label: string) {
    const t = label.toLowerCase();
    if (t.includes("desktop")) return <Monitor className="size-4" />;
    if (t.includes("mobile")) return <Smartphone className="size-4" />;
    return <Globe className="size-4" />;
  }

  function createdText(iso: string) {
    try {
      const d = new Date(iso);
      const diff = Date.now() - d.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days >= 1) return `Created ${days} day${days > 1 ? "s" : ""} ago`;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours >= 1) return `Created ${hours} hour${hours > 1 ? "s" : ""} ago`;
      const mins = Math.max(1, Math.floor(diff / (1000 * 60)));
      return `Created ${mins} min${mins > 1 ? "s" : ""} ago`;
    } catch {
      return "Created";
    }
  }

  return (
    <div className="relative rounded-xl border border-border bg-card p-5">
      {blocking && (
        <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
          <div className="text-xs text-muted-foreground">Revoking…</div>
        </div>
      )}
      <div>
        {loading ? (
          <div>
            {[0, 1, 2].map((i) => (
              <div key={i}>
                {i !== 0 && (
                  <div className="mx-2 h-px bg-muted-foreground/8 dark:bg-muted-foreground/12" />
                )}
                <div className="flex items-start justify-between py-3">
                  <div className="flex items-center gap-2 w-full">
                    <span className="w-5 flex justify-center text-muted-foreground">
                      <span className="h-4 w-4 rounded-sm bg-muted animate-pulse" />
                    </span>
                    <div className="flex-1">
                      <div className="h-3 w-40 rounded bg-muted animate-pulse" />
                      <div className="mt-2 h-2 w-28 rounded bg-muted animate-pulse" />
                    </div>
                  </div>
                  <span className="h-7 w-16 rounded-md bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-3 text-xs text-muted-foreground">No active sessions</div>
        ) : (
          sessions.map((s, idx) => (
            <div key={s.id}>
              {idx !== 0 && (
                <div className="mx-2 h-px bg-muted-foreground/8 dark:bg-muted-foreground/12" />
              )}
              <div className="flex items-start justify-between py-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 flex justify-center text-muted-foreground">{iconFor(s.label)}</span>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm font-medium">{s.label}{s.session_key === myKey ? " (This device)" : ""}</span>
                    <span className="text-xs text-muted-foreground">{createdText(s.last_seen_at)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => revoke(s)}
                  disabled={!!s.revoked_at}
                  className="h-7 px-3 rounded-md text-xs bg-[#f0f8ff] text-[var(--foreground)] border border-border hover:bg-[#E9F3FF] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] cursor-pointer"
                >
                  {s.revoked_at ? "Revoked" : "Revoke"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
