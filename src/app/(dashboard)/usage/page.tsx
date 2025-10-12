"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Page() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user?.id) return router.replace("/login");
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (prof?.role === "customer") setAllowed(true);
      else router.replace("/overview");
    })();
  }, [router]);

  if (!allowed) return null;

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Usage</h1>
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </div>
  );
}
