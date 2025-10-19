"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Topbar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<{ name?: string; email?: string; first_name?: string; last_name?: string }>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  useEffect(() => {
    // Fetch user and profile details for initials
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      const base = {
        name: (u?.user_metadata?.full_name as string) || undefined,
        email: u?.email || undefined,
      } as { name?: string; email?: string; first_name?: string; last_name?: string };
      if (u?.id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("first_name, last_name, name, email")
          .eq("id", u.id)
          .maybeSingle();
        setProfile({
          name: prof?.name ?? base.name,
          email: prof?.email ?? base.email,
          first_name: prof?.first_name ?? undefined,
          last_name: prof?.last_name ?? undefined,
        });
      } else {
        setProfile(base);
      }
      setAvatarLoaded(true);
    });

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
    setMenuOpen(false);
    router.replace("/login");
    router.refresh();
  };

  // Compute two-letter initials
  const initials = (() => {
    const fn = profile.first_name?.trim();
    const ln = profile.last_name?.trim();
    if (fn || ln) return `${fn?.[0] ?? ''}${ln?.[0] ?? ''}`.toUpperCase() || '';
    const n = (profile.name ?? '').trim();
    if (n) {
      const parts = n.split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return n.slice(0, 2).toUpperCase();
    }
    const ep = (profile.email ?? '').split('@')[0] ?? '';
    if (ep) {
      const parts = ep.replace(/[._-]+/g, ' ').split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return ep.slice(0, 2).toUpperCase();
    }
    return '';
  })();

  return (
    <header className="relative z-50 h-[120px] bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-[60px] grid h-[120px] items-center grid-cols-[160px_1fr_160px]">
        {/* Left: Logo (wordmark) */}
        <div className="flex items-center">
          <Link aria-label="Homepage" href="/overview" className="relative flex w-fit items-center overflow-hidden">
            <Image
              src="/mindsfire-black-logo.svg"
              alt="Mindsfire"
              width={1478}
              height={184}
              priority
              className="w-[160px] h-auto"
            />
          </Link>
        </div>

        {/* Center: Section tabs */}
        <div className="flex items-center justify-center">
          <p className="text-base leading-6">Dashboard</p>
        </div>

        {/* Right: Avatar (tucked) */}
        <div ref={menuRef} className="relative flex items-center justify-end">
          <button
            aria-label="User menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-12 w-12 items-center justify-center rounded-full outline-none focus:outline-none"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-foreground">
              <span className="text-[11px] font-semibold tracking-wide">{avatarLoaded ? initials : ''}</span>
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-border bg-card text-card-foreground shadow-lg p-3">
              <div className="pb-3 mb-3 border-b border-border">
                <div className="text-sm font-semibold truncate">{profile.name ?? "Account"}</div>
                {profile.email && (
                  <div className="text-xs text-muted-foreground truncate">{profile.email}</div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between text-left text-sm rounded-md px-2 py-2 hover:bg-[#E7F1FF] cursor-pointer"
              >
                <span>Log Out</span>
                <LogOut className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
