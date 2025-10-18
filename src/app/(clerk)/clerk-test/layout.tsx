"use client";

import { ClerkProvider } from "@clerk/nextjs";
import Link from "next/link";

export default function ClerkTestLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <div className="min-h-dvh">
        <header className="border-b border-border bg-card/50 backdrop-blur">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
            <nav className="text-sm flex items-center gap-4">
              <Link href="/clerk-test" className="hover:underline">Clerk Test</Link>
              <Link href="/clerk-test/sign-in" className="hover:underline">Sign In</Link>
              <Link href="/clerk-test/sign-up" className="hover:underline">Sign Up</Link>
              <Link href="/clerk-test/protected" className="hover:underline">Protected</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </div>
    </ClerkProvider>
  );
}
