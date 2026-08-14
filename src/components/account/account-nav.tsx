"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MapPin, Megaphone, Package, Settings, Ticket, Undo2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { link } from "@/lib/links";
import { cn } from "@/lib/utils";

export function AccountNav() {
  const { locale, t } = useI18n();
  const pathname = usePathname();

  const nav = [
    { href: "/account", label: t.account.dashboard, icon: LayoutDashboard },
    { href: "/account/orders", label: t.account.orders, icon: Package },
    { href: "/account/addresses", label: t.account.addresses, icon: MapPin },
    { href: "/account/returns", label: t.account.returns, icon: Undo2, flipRtl: true },
    { href: "/account/notifications", label: t.account.notifications, icon: Megaphone },
    { href: "/account/support", label: t.account.support, icon: Ticket },
    { href: "/account/settings", label: t.account.settings, icon: Settings },
  ];

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0 lg:space-y-1">
      {nav.map((item) => {
        const href = link(locale, item.href);
        const isActive =
          item.href === "/account"
            ? pathname === href
            : pathname.startsWith(href);
        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium hover:bg-accent",
              isActive && "bg-accent text-accent-foreground",
            )}
          >
            <item.icon
              className={cn("h-4 w-4", "flipRtl" in item && item.flipRtl && "rtl:-scale-x-100")}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
