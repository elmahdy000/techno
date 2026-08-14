"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  Package,
  Wallet,
  Banknote,
  NotebookPen,
  Star,
  Megaphone,
  Store,
} from "lucide-react";
import { useI18n } from "@/i18n/client";
import { link } from "@/lib/links";
import { cn } from "@/lib/utils";

export function VendorNav() {
  const { locale, t } = useI18n();
  const pathname = usePathname();

  const nav = [
    { href: "/vendor", label: t.vendor.overview, icon: LayoutDashboard },
    { href: "/vendor/products", label: t.vendor.products, icon: Package },
    { href: "/vendor/inventory", label: t.vendor.inventory, icon: NotebookPen },
    { href: "/vendor/orders", label: t.vendor.orders, icon: BarChart3 },
    { href: "/vendor/commission", label: t.vendor.commission, icon: Wallet },
    { href: "/vendor/wallet", label: t.vendor.wallet, icon: Banknote },
    { href: "/vendor/withdrawals", label: t.vendor.withdrawals, icon: Banknote },
    { href: "/vendor/reviews", label: t.vendor.reviews, icon: Star },
    { href: "/vendor/notifications", label: t.vendor.notifications, icon: Megaphone },
    { href: "/vendor/profile", label: t.vendor.profile, icon: Store },
  ];

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0 lg:space-y-1">
      {nav.map((item) => {
        const href = link(locale, item.href);
        const isActive =
          item.href === "/vendor"
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
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
