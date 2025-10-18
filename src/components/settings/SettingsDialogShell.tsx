"use client";

import { ReactNode } from "react";
import { Loader2, XIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type SettingsDialogShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  showCloseButton?: boolean;
  titleClassName?: string;
  primaryLoading?: boolean;
};

export default function SettingsDialogShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  primaryActionLabel = "Done",
  onPrimaryAction,
  showCloseButton = true,
  titleClassName,
  primaryLoading = false,
}: SettingsDialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[500px] max-w-[calc(100%-2rem)] rounded-2xl border border-border bg-card text-card-foreground px-5 py-5 gap-4 shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25),0px_12px_24px_-8px_rgba(0,0,0,0.15)] dark:shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.8),0px_12px_24px_-8px_rgba(0,0,0,0.6)] max-h-[80vh] overflow-y-auto"
     >
        {(title || description || showCloseButton) && (
          <div className="mb-1 flex items-start justify-between gap-2">
            <DialogHeader className="mb-0 flex-1 text-left">
              {title ? (
                <DialogTitle className={titleClassName ?? "text-xl leading-6 font-semibold tracking-tight"}>
                  {title}
                </DialogTitle>
              ) : null}
              {description ? (
                <DialogDescription className="text-sm">
                  {description}
                </DialogDescription>
              ) : null}
            </DialogHeader>
            <DialogClose
              className="h-7 w-7 grid place-items-center rounded-md bg-[#f0f8ff] text-[var(--foreground)] border border-border hover:bg-[#E9F3FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] cursor-pointer"
            >
              <span className="sr-only">Close</span>
              <XIcon className="size-4" />
            </DialogClose>
          </div>
        )}

        <div>{children}</div>

        <DialogFooter className="pt-2">
          <Button onClick={onPrimaryAction} size="sm" className="px-4" disabled={primaryLoading}>
            {primaryLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {primaryActionLabel}
              </>
            ) : (
              primaryActionLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
