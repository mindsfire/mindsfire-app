import ProfileCardClient from "./ProfileCardClient";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export default async function ProfileCardServer() {
  const { userId } = await auth();
  if (!userId) {
    return <ProfileCardClient />;
  }
  const db = getSupabaseAdmin();
  const { data: prof } = await db
    .from("profiles")
    .select("phone_e164, country_code, region")
    .eq("clerk_id", userId)
    .maybeSingle();

  return (
    <ProfileCardClient
      initialPhoneE164={(prof?.phone_e164 as string) ?? null}
      initialCountryCode={(prof?.country_code as string) ?? null}
      initialRegion={(prof?.region as string) ?? null}
    />
  );
}
