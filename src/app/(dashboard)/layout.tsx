import { ReactNode, Suspense } from "react";
import TopbarServer from "./TopbarServer";
import ServerSidebar from "./ServerSidebar";
import InitialLoadGate from "./InitialLoadGate";
import SessionBootstrapClient from "./SessionBootstrapClient";
import { supabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

 

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Server-side guard: if not authenticated, redirect to login
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login?redirect=%2Foverview");
  }

  return (
    <div className="min-h-dvh">
      <div id="ssr-initial-overlay" className="fixed inset-0 z-[2147483646] bg-white dark:bg-black" aria-hidden />
      <InitialLoadGate />
      <SessionBootstrapClient />
      <Suspense fallback={<div className="h-[64px]" aria-hidden />}> 
        <TopbarServer />
      </Suspense>
      <div className="mx-auto w-full max-w-7xl px-6 grid grid-cols-[260px_20px_1fr] min-h-[calc(100dvh-120px)]">
        <Suspense fallback={<aside className="sticky top-0 h-[calc(100dvh-120px)]" aria-hidden />}>
          <ServerSidebar />
        </Suspense>
        <div aria-hidden className="hidden md:block" />
        <main className="w-full pt-4 pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
