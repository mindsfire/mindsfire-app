"use client";

import { useState } from "react";
import SettingsDialogShell from "@/components/settings/SettingsDialogShell";

export default function ProfileCardClient() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="text-sm font-medium">Profile</div>
            <div className="text-xs text-muted-foreground">+919035231806</div>
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
        primaryActionLabel="Done"
        onPrimaryAction={() => setOpen(false)}
      >
        <div className="text-sm text-muted-foreground">{/* Content TBD */}</div>
      </SettingsDialogShell>
    </>
  );
}
