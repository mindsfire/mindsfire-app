import { ReactNode } from "react";
import TopbarServer from "./TopbarServer";
import ServerSidebar from "./ServerSidebar";
import InitialLoadGate from "./InitialLoadGate";
import SessionBootstrapClient from "./SessionBootstrapClient";

 

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <div id="ssr-initial-overlay" className="fixed inset-0 z-[2147483646] bg-white dark:bg-black" aria-hidden />
      <InitialLoadGate />
      <SessionBootstrapClient />
      <TopbarServer />
      <div className="mx-auto w-full max-w-7xl px-6 grid grid-cols-[260px_20px_1fr] min-h-[calc(100dvh-120px)]">
        <ServerSidebar />
        <div aria-hidden className="hidden md:block" />
        <main className="w-full pt-4 pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
