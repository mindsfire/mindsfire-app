import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Page() {
  const { userId } = await auth();
  if (!userId) redirect("/clerk-test/sign-in");

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Protected (Clerk)</h1>
      <p className="text-sm text-muted-foreground">You are signed in with Clerk. userId: <code>{userId}</code></p>
    </div>
  );
}
