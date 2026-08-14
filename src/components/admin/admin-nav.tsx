"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Store, ShoppingBag, Banknote, Ticket, Star, Undo2, Settings } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { link } from "@/lib/links";
import { cn } from "@/lib/utils";

export function AdminNav() {
  const { locale, t } = useI18n();
  const pathname = usePathname();

  const nav = [
    { href: "/admin", label: t.admin.overview, icon: LayoutDashboard },
    { href: "/admin/users", label: t.admin.users, icon: Users },
    { href: "/admin/vendors", label: t.admin.vendors, icon: Store },
    { href: "/admin/orders", label: t.admin.orders, icon: ShoppingBag },
    { href: "/admin/withdrawals", label: t.admin.withdrawals, icon: Banknote },
    { href: "/admin/reviews", label: t.admin.reviews, icon: Star },
    { href: "/admin/returns", label: t.admin.returns, icon: Undo2 },
    { href: "/admin/support", label: t.admin.support, icon: Ticket },
    { href: "/admin/commission", label: t.admin.commission, icon: Settings },
  ];

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0 lg:space-y-1">
      {nav.map((item) => {
        const href = link(locale, item.href);
        const isActive =
          item.href === "/admin" ? pathname === href : pathname.startsWith(href);
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
