"use client";

import { useEffect, useMemo, useState } from "react";
import SettingsDialogShell from "@/components/settings/SettingsDialogShell";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Country, State } from "country-state-city";
import { supabase } from "@/lib/supabaseClient";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import "./phone-input.css";
import { ChevronDown } from "lucide-react";

export default function ProfileCardClient() {
  const [open, setOpen] = useState(false);
  const [countryCode, setCountryCode] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [phoneE164, setPhoneE164] = useState<string | undefined>(undefined);
  const [phoneCountry, setPhoneCountry] = useState<string>("US");
  const [syncedFromPhoneOnce, setSyncedFromPhoneOnce] = useState<boolean>(false);
  const [displayPhone, setDisplayPhone] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ALLOWED = ["US", "GB", "DE", "AU", "AE", "IN"] as const;

  const countries = useMemo(
    () => Country.getAllCountries().filter((c) => ALLOWED.includes(c.isoCode as any)),
    []
  );

  const states = useMemo(
    () => (countryCode ? State.getStatesOfCountry(countryCode) : []),
    [countryCode]
  );

  const displayCountryName = useMemo(() => {
    const c = countries.find((c) => c.isoCode === countryCode);
    return c?.name ?? "";
  }, [countries, countryCode]);

  // If country is empty, infer from phone value on change (best-effort)
  useEffect(() => {
    // react-phone-number-input does not expose country directly, we keep country independent.
    // We can set a sensible default for the country dropdown when it's empty.
    if (!countryCode) {
      // If phone starts with +91, +1, etc., we could infer here with libphonenumber-js later.
    }
  }, [phoneE164, countryCode]);

  // Prefill from Supabase
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("phone_e164, country_code, region")
        .eq("id", uid)
        .maybeSingle();
      if (prof) {
        setPhoneE164(prof.phone_e164 ?? undefined);
        setDisplayPhone(prof.phone_e164 ?? "");
        setCountryCode(prof.country_code ?? "");
        setPhoneCountry((prof.country_code as string) || "US");
        setRegion(prof.region ?? "");
        // If a country already exists, consider auto-sync already satisfied
        if (prof.country_code) setSyncedFromPhoneOnce(true);
      }
    })();
  }, []);

  // Reset one-time sync flag when dialog opens
  useEffect(() => {
    if (open) {
      setSyncedFromPhoneOnce(!!countryCode);
    }
  }, [open]);

  async function handleSave() {
    setError(null);
    try {
      // Basic validation: if phone provided, must be valid E.164
      if (phoneE164 && !isValidPhoneNumber(phoneE164)) {
        setError("Please enter a valid phone number.");
        return;
      }
      setSaving(true);
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_e164: phoneE164 ?? null,
          country_code: countryCode || null,
          region: region || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Failed to save.");
        return;
      }
      setDisplayPhone(phoneE164 || "");
      setOpen(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="text-sm font-medium">Phone</div>
            <div className="text-xs text-muted-foreground">{displayPhone || "Not added"}</div>
            <div className="pt-3">
              <div className="text-sm font-medium">Region</div>
              <div className="text-xs text-muted-foreground">
                {displayCountryName || region
                  ? [region, displayCountryName].filter(Boolean).join(", ")
                  : "Not added"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-7 px-3 rounded-md text-xs bg-[#f0f8ff] text-[var(--foreground)] border border-border hover:bg-[#E9F3FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] cursor-pointer"
          >
            Edit
          </button>
        </div>
      </div>

      <SettingsDialogShell
        open={open}
        onOpenChange={setOpen}
        title="Edit Your Profile"
        titleClassName="text-xl leading-6"
        primaryActionLabel={saving ? "Saving..." : "Done"}
        primaryLoading={saving}
        onPrimaryAction={handleSave}
      >
        <div className="grid gap-4">
          <div className="space-y-1">
            <Label>Phone</Label>
            <div className="flex items-center">
              <PhoneInput
                key={phoneCountry}
                value={phoneE164}
                onChange={setPhoneE164}
                defaultCountry={phoneCountry as any}
                countries={ALLOWED as any}
                international={false}
                onCountryChange={(c) => {
                  // On first change only, auto-sync Country to match PhoneInput
                  if (!syncedFromPhoneOnce) {
                    const next = c || "";
                    setPhoneCountry(next || "US");
                    setCountryCode(next);
                    setRegion("");
                    setSyncedFromPhoneOnce(true);
                  }
                }}
                className="PhoneInput w-full"
              />
            </div>
            {phoneE164 && !isValidPhoneNumber(phoneE164) ? (
              <div className="text-xs text-destructive">Invalid phone number.</div>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label>Country</Label>
            <div className="relative">
              <Select
                value={countryCode}
                onChange={(e) => {
                  const cc = e.target.value;
                  setCountryCode(cc);
                  setPhoneCountry(cc || "US");
                  setRegion("");
                  // After user customizes Country, stop auto-syncing from PhoneInput
                  setSyncedFromPhoneOnce(true);
                }}
                className="appearance-none pr-8"
              >
                <option value="">Select Country</option>
                {countries.map((c) => (
                  <option key={c.isoCode} value={c.isoCode}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>State</Label>
            <div className="relative">
              <Select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                disabled={!countryCode}
                className="appearance-none pr-8"
              >
                <option value="">Select State</option>
                {states.map((s) => (
                  <option key={s.isoCode} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            </div>
          </div>

          {error ? (
            <div className="text-xs text-destructive">{error}</div>
          ) : null}
        </div>
      </SettingsDialogShell>
    </>
  );
}
