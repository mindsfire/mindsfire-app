import { supabaseServer } from "@/lib/supabaseServer";
import ProfileCardClient from "./ProfileCardClient";

export default async function ProfileCardServer() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) {
    return (
      <ProfileCardClient />
    );
  }
  const { data: prof } = await supabase
    .from("profiles")
    .select("phone_e164, country_code, region")
    .eq("id", uid)
    .maybeSingle();

  return (
    <ProfileCardClient
      initialPhoneE164={(prof?.phone_e164 as string) ?? null}
      initialCountryCode={(prof?.country_code as string) ?? null}
      initialRegion={(prof?.region as string) ?? null}
    />
  );
}
