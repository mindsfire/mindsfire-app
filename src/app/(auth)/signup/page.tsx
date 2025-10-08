"use client";

import Link from "next/link";
import Image from "next/image";

export default function SignupPage() {
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

          <form className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Full name</label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
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
                required
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
                required
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
                required
                className="block w-full h-10 rounded-md bg-card text-card-foreground border border-border px-3 outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              />
            </div>

            <button type="submit" className="w-full h-10 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition">
              Create account
            </button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground hover:underline">Sign in</Link>
          </p>
          </div>
        </div>

        {/* Disclaimer pinned to bottom of left panel */}
        <div className="w-full max-w-sm mx-auto pt-6 text-center text-xs text-muted-foreground">
          By creating an account, you agree to the{' '}
          <Link href="/terms" className="underline text-foreground">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="underline text-foreground">Privacy Policy</Link>.
        </div>
      </section>

      {/* Right: Testimonials (70%) - white background for content to stand out */}
      <section className="bg-white text-slate-900 p-8 md:p-12 flex items-center justify-center">
        <div className="w-full max-w-3xl space-y-6 mx-auto">
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
