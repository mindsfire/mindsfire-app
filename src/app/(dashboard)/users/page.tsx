import { supabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    redirect("/login?redirect=%2Fusers");
  }
  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = String(prof?.role || "customer").toLowerCase();
  if (role !== "admin") {
    redirect("/overview");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Users</h1>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="text-sm text-muted-foreground">Invite, manage roles, and remove team members (stub).</div>
      </div>
    </div>
  );
}
