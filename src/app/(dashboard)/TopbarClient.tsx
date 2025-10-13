"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export type TopbarClientProps = {
  initials: string;
  name?: string;
  email?: string;
};

export default function TopbarClient({ initials, name, email }: TopbarClientProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <span className="text-[11px] font-semibold tracking-wide">{initials}</span>
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-border bg-card text-card-foreground shadow-lg p-3">
              <div className="pb-3 mb-3 border-b border-border">
                <div className="text-sm font-semibold truncate">{name ?? "Account"}</div>
                {email && (
                  <div className="text-xs text-muted-foreground truncate">{email}</div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between text-left text-sm rounded-md px-2 py-2 hover:bg-muted/50"
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
