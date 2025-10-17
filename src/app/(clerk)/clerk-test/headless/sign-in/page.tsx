"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignIn, useAuth, useClerk } from "@clerk/nextjs";

function HeadlessSignInInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If a session already exists, skip sign-in and redirect
  if (isSignedIn) {
    const next = search.get("redirect") || "/overview";
    router.replace(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isLoaded) return;
    setLoading(true);
    try {
      const res = await signIn.create({ identifier: email, password });
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        const next = search.get("redirect") || "/overview";
        router.replace(next);
        router.refresh();
      } else {
        setError("Additional steps required (MFA/password reset). Not handled in this demo.");
      }
    } catch (err: unknown) {
      const msg = typeof err === "object" && err !== null && "errors" in err
        ? (err as { errors?: Array<{ message?: string }> }).errors?.[0]?.message
        : (err as { message?: string } | null | undefined)?.message;
      setError(msg || "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Headless Sign In (Clerk)</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full h-10 rounded-md border border-border px-3" type="email" placeholder="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
        <input className="w-full h-10 rounded-md border border-border px-3" type="password" placeholder="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
        <button disabled={loading} className="w-full h-10 rounded-md bg-primary text-primary-foreground disabled:opacity-60">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <div className="pt-2">
        <button onClick={() => signOut().then(()=>router.refresh())} className="text-xs underline text-muted-foreground">Sign out current session</button>
      </div>
    </div>
  );
}

export default function HeadlessSignInPage() {
  return (
    <Suspense fallback={null}>
      <HeadlessSignInInner />
    </Suspense>
  );
}
