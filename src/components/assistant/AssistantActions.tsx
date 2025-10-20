"use client";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, MessageSquareText, Phone, ClipboardPlus, UserRound, AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";

export type AssistantActionsProps = {
  name?: string | null;
  email?: string | null;
  phoneE164?: string | null;
  onAssignTask?: () => void;
  onMessage?: () => void;
  onCall?: () => void;
  onChangeAssistant?: () => void;
  onEscalate?: () => void;
  compact?: boolean;
};

export default function AssistantActions({ name, email, phoneE164, onAssignTask, onMessage, onCall, onChangeAssistant, onEscalate, compact = true }: AssistantActionsProps) {
  const telHref = useMemo(() => (phoneE164 ? `tel:${phoneE164}` : undefined), [phoneE164]);
  const [open, setOpen] = useState(false);

  // Match the subtle "Edit" button style from settings Phone card when compact
  const triggerClass = compact
    ? "h-7 px-3 rounded-md text-xs bg-[#f0f8ff] text-[var(--foreground)] border border-border hover:bg-[#E9F3FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    : "h-8 px-3 rounded-md text-xs bg-muted hover:bg-muted/80 border border-border";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className={triggerClass} aria-label="Assistant actions">
        <span className="inline-flex items-center gap-1">
          <span>Actions</span>
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : "rotate-0"}`} />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-[180px]">
        <DropdownMenuItem
          onClick={() => {
            if (onCall) return onCall();
            if (telHref) window.location.href = telHref;
          }}
          disabled={!onCall && !telHref}
          className="flex items-center gap-2"
        >
          <Phone className="size-4" />
          <span>Call</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            if (onMessage) return onMessage();
            // Fallback: open mailto if we don't have an in-app messenger yet
            if (email) window.location.href = `mailto:${email}`;
          }}
          disabled={!onMessage && !email}
          className="flex items-center gap-2"
        >
          <MessageSquareText className="size-4" />
          <span>Message</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onAssignTask?.()}
          className="flex items-center gap-2"
        >
          <ClipboardPlus className="size-4" />
          <span>Assign Task</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onChangeAssistant?.()}
          className="flex items-center gap-2"
        >
          <UserRound className="size-4" />
          <span>Change Assistant</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onEscalate?.()}
          className="flex items-center gap-2"
        >
          <AlertTriangle className="size-4" />
          <span>Escalation</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
