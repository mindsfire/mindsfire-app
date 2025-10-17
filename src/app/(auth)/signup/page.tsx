"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignUp, useAuth } from "@clerk/nextjs";

export default function SignupPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isSignedIn } = useAuth();

  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [info, setInfo] = useState<string | null>(null);

  // If already signed in, go to overview (or redirect)
  useEffect(() => {
    if (isSignedIn) {
      const next = search.get("redirect") || "/overview";
      if (typeof window !== "undefined") window.location.replace(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  const nextUrl = () => search.get("redirect") || "/overview";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isLoaded) return;
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const firstName = name.trim();
      const ln = lastName.trim();
      const res = await signUp.create({
        emailAddress: email.trim(),
        password,
        ...(firstName ? { firstName } : {}),
        ...(ln ? { lastName: ln } : {}),
      });
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        if (typeof window !== "undefined") window.location.replace(nextUrl());
        return;
      }
      // Not complete: trigger email OTP and show verification step
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || err?.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isLoaded) return;
    setLoading(true);
    try {
      const res = await signUp.attemptEmailAddressVerification({ code });
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        if (typeof window !== "undefined") window.location.replace(nextUrl());
        return;
      }
      setError("Verification not completed. Please try again.");
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || err?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh relative">
      {/* Background: make right 70% white behind header and body */}
      <div className="hidden md:block absolute inset-y-0 right-0 w-[70%] bg-white pointer-events-none -z-10" />

      {/* Top header with logo (same placement as dashboard) */}
      <header className="h-[120px] bg-transparent">
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
          <div />
        </div>
      </header>

      {/* Body split grid */}
      <div className="grid grid-cols-1 md:grid-cols-[30%_70%]">
      {/* Left: Signup (30%) - uses theme background */}
      <section className="bg-background text-foreground flex flex-col p-6 md:p-10 min-h-[calc(100dvh-120px)]">
        <div className="w-full max-w-sm mx-auto flex-1 flex items-center">
          <div className="w-full">

          <h1 className="text-2xl font-semibold mb-2">Get Started</h1>
          <p className="text-sm text-muted-foreground mb-6">Create a new account</p>

          {/* Sign up form */}
          {!pendingVerification && (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">First name</label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Jane"
                required
                value={name}
                onChange={(e)=>setName(e.target.value)}
                disabled={loading}
                className="block w-full h-10 rounded-md bg-card text-card-foreground border border-border px-3 outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium">Last name</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                placeholder="Smith"
                required
                value={lastName}
                onChange={(e)=>setLastName(e.target.value)}
                disabled={loading}
                className="block w-full h-10 rounded-md bg-card text-card-foreground border border-border px-3 outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Your email address"
                required
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                disabled={loading}
                className="block w-full h-10 rounded-md bg-card text-card-foreground border border-border px-3 outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="*****"
                required
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                disabled={loading}
                className="block w-full h-10 rounded-md bg-card text-card-foreground border border-border px-3 outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm" className="text-sm font-medium">Confirm password</label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                placeholder="*****"
                required
                value={confirm}
                onChange={(e)=>setConfirm(e.target.value)}
                disabled={loading}
                className="block w-full h-10 rounded-md bg-card text-card-foreground border border-border px-3 outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              />
            </div>

            {error && <div className="text-sm text-red-600" role="alert">{error}</div>}

            <button type="submit" disabled={loading} className="w-full h-10 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-60">
              {loading ? "Creating..." : "Create account"}
            </button>
          </form>
          )}

          {/* Email code verification step (if enabled in Clerk) */}
          {pendingVerification && (
            <form className="space-y-4" onSubmit={onVerify}>
              <div className="space-y-2">
                <label htmlFor="code" className="text-sm font-medium">Verification code</label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter the 6-digit code sent to your email"
                  value={code}
                  onChange={(e)=>setCode(e.target.value)}
                  disabled={loading}
                  className="block w-full h-10 rounded-md bg-card text-card-foreground border border-border px-3 outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                />
              </div>
              {error && <div className="text-sm text-red-600" role="alert">{error}</div>}
              {info && <div className="text-sm text-green-600" role="status">{info}</div>}
              <button type="submit" disabled={loading} className="w-full h-10 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-60">
                {loading ? "Verifying..." : "Verify and continue"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={async ()=>{
                  setError(null);
                  setInfo(null);
                  try {
                    if (!isLoaded) return;
                    await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
                    setInfo("Code sent. Please check your email inbox/spam.");
                  } catch (e: any) {
                    setError(e?.errors?.[0]?.message || e?.message || "Could not resend code");
                  }
                }}
                className="w-full h-10 rounded-md border border-border text-foreground hover:bg-muted/50 transition disabled:opacity-60"
              >
                Resend code
              </button>
            </form>
          )}

          <p className="mt-6 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground hover:underline">Sign in</Link>
          </p>
          </div>
        </div>

        {/* Disclaimer pinned to bottom of left panel */}
        <div className="w-full max-w-sm mx-auto pt-27 text-center text-xs text-muted-foreground">
          By creating an account, you agree to the{' '}
          <Link href="/terms" className="underline text-foreground">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="underline text-foreground">Privacy Policy</Link>.
        </div>
      </section>

      {/* Right: Testimonials (70%) - white background for content to stand out */}
      <section className="bg-white text-slate-900 p-8 md:p-12 flex items-center justify-center min-h-[calc(100dvh-120px)]">
        <div className="w-full max-w-3xl space-y-6 mx-auto -mt-27 md:-mt-52">
          <h2 className="text-xl font-semibold">Why teams choose us</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm leading-relaxed">“Onboarding was instant and the team started delivering in week one.”</p>
              <div className="mt-3 text-xs text-slate-500">— Founder, Fintech</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm leading-relaxed">“Great ops partner; reliable and proactive.”</p>
              <div className="mt-3 text-xs text-slate-500">— COO, SaaS</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm leading-relaxed">“Helped us keep focus on core product work.”</p>
              <div className="mt-3 text-xs text-slate-500">— PM, AI Startup</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm leading-relaxed">“Responsive, precise, and dependable.”</p>
              <div className="mt-3 text-xs text-slate-500">— Founder, Agency</div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
