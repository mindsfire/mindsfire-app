import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "h-10 w-full rounded-md border border-border bg-background px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";
