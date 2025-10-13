"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const form = e.currentTarget as HTMLFormElement;
      const formData = new FormData(form);
      const email = String(formData.get("email") || "").trim();
      const password = String(formData.get("password") || "");

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      // Ensure server has the session cookies set for middleware
      const access_token = data.session?.access_token;
      const refresh_token = data.session?.refresh_token;
      if (access_token && refresh_token) {
        await fetch("/api/auth/set-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ access_token, refresh_token }),
        });
      }
      const next = searchParams.get("redirect") || "/overview";
      router.replace(next);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="min-h-dvh relative">
      {/* Top header with logo (same placement as dashboard) */}
      {/* Background: make right 70% white behind header and body */}
      <div className="hidden md:block absolute inset-y-0 right-0 w-[70%] bg-white pointer-events-none z-0" />

      <header className="h-[120px] bg-transparent relative z-10">
        <div className="w-full px-[60px] grid h-[120px] items-center grid-cols-[160px_1fr_160px]">
          <div className="flex items-center">
            <Link aria-label="Homepage" href="/dashboard" className="relative flex w-fit items-center overflow-hidden">
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
          <div />
        </div>
      </header>

      {/* Body split grid */}
      <div className="grid grid-cols-1 md:grid-cols-[30%_70%] min-h-[calc(100dvh-120px)] relative z-10">
        {/* Left: Login (30%) - uses theme background */}
        <section className="bg-background text-foreground flex flex-col p-6 md:p-10 min-h-[calc(100dvh-120px)]">
          <div className="w-full max-w-sm mx-auto flex-1 flex items-center">
            <div className="w-full">
              <h1 className="text-2xl font-semibold mb-2">Welcome back</h1>
              <p className="text-sm text-muted-foreground mb-6">Sign in to your account</p>

              {error && (
                <div className="mb-4 text-sm text-red-600" role="alert">
                  {error}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Your email address"
                    required
                    disabled={loading}
                    className="block w-full h-10 rounded-md bg-card text-card-foreground border border-border px-3 outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium">Password</label>
                    <Link href="#" className="text-xs text-muted-foreground hover:underline">Forgot password?</Link>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="*****"
                    required
                    disabled={loading}
                    className="block w-full h-10 rounded-md bg-card text-card-foreground border border-border px-3 outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full h-10 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <p className="mt-6 text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="font-medium text-foreground hover:underline">Sign Up Now</Link>
              </p>
            </div>
          </div>

          {/* Disclaimer pinned to bottom of left panel */}
          <div className="w-full max-w-sm mx-auto pt-35 text-center text-xs text-muted-foreground">
            By continuing, you agree to the{' '}
            <Link href="/terms" className="underline text-foreground">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline text-foreground">Privacy Policy</Link>.
          </div>
        </section>

        {/* Right: Testimonials (70%)) - white background for content to stand out */}
        <section className="bg-white text-slate-900 p-8 md:p-12 flex items-center justify-center min-h-[calc(100dvh-120px)]">
          <div className="w-full max-w-3xl space-y-6 mx-auto -mt-27 md:-mt-52">
            <h2 className="text-xl font-semibold">What our customers say</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm leading-relaxed">&quot;The team handled research and coordination flawlessly. Massive time saver.&quot;</p>
                <div className="mt-3 text-xs text-slate-500">— Founder, SaaS</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm leading-relaxed">&quot;Great communication and on‑time delivery. Highly recommend.&quot;</p>
                <div className="mt-3 text-xs text-slate-500">— Ops Lead, E‑commerce</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm leading-relaxed">&quot;Felt like an extension of our in‑house team.&quot;</p>
                <div className="mt-3 text-xs text-slate-500">— Director, Consulting</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm leading-relaxed">&quot;We scaled operations without scaling cost.&quot;</p>
                <div className="mt-3 text-xs text-slate-500">— COO, Marketplace</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
