"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, Settings, Puzzle, UsersRound, LifeBuoy, ListChecks, BarChart3, ReceiptText, MessageCircle, Gift } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  iconKey: "gauge" | "settings" | "puzzle" | "users" | "life-buoy" | "list-checks" | "bar-chart" | "receipt" | "message" | "gift";
};

export function ClientNavList({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const iconMap = {
    "gauge": Gauge,
    "settings": Settings,
    "puzzle": Puzzle,
    "users": UsersRound,
    "life-buoy": LifeBuoy,
    "list-checks": ListChecks,
    "bar-chart": BarChart3,
    "receipt": ReceiptText,
    "message": MessageCircle,
    "gift": Gift,
  } as const;
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(item.href);
        const Icon = iconMap[item.iconKey];
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={[
                "group flex h-9 items-center gap-2 rounded-lg px-2 text-sm transition-all",
                active
                  ? "bg-secondary text-secondary-foreground"
                  : "hover:bg-secondary hover:text-[#0a0c10]",
              ].join(" ")}
            >
              <Icon
                className={[
                  "size-4 [stroke-width:2]",
                  active
                    ? "text-secondary-foreground [stroke-width:2.5]"
                    : "text-muted-foreground group-hover:text-[#0a0c10] group-hover:[stroke-width:2.5]",
                ].join(" ")}
              />
              <span className={active ? "font-semibold" : "group-hover:font-semibold"}>{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
