"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Languages, LogOut, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/client";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { link } from "@/lib/links";

export function LocaleSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(next: Locale) {
    if (next === locale) return;
    const rest = pathname.replace(new RegExp(`^/${locale}`), "");
    router.replace(`${link(next, rest || "/")}`);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t.nav.locale}>
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{localeNames[locale]}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {locales.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => switchTo(l)}>
            {localeNames[l]}
            {l === locale && <span className="ms-auto text-muted-foreground">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserMenu({
  signedIn,
  name,
  email,
  role,
  locale,
}: {
  signedIn: boolean;
  name?: string;
  email?: string;
  role?: string;
  locale: Locale;
}) {
  const t = useI18n().t;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="sm">
          <Link href={link(locale, "/auth/login")}>{t.nav.login}</Link>
        </Button>
        <Button asChild size="sm">
          <Link href={link(locale, "/auth/register")}>{t.nav.register}</Link>
        </Button>
      </div>
    );
  }

  const dashboardLink =
    role === "VENDOR"
      ? link(locale, "/vendor")
      : role === "ADMIN" || role === "SUPER_ADMIN"
        ? link(locale, "/admin")
        : link(locale, "/account");

  function logout() {
    setOpen(false);
    startTransition(async () => {
      const { signOut } = await import("next-auth/react");
      await signOut({ redirect: true, callbackUrl: `/${locale}` });
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2">
          <User className="h-4 w-4" />
          <span className="hidden max-w-40 truncate sm:inline-block">{name}</span>
          <ChevronDown className="hidden h-3.5 w-3.5 sm:inline-block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={dashboardLink} className="cursor-pointer">
            {dashboardLink.includes("/vendor") ? t.nav.vendor : dashboardLink.includes("/admin") ? t.nav.admin : t.nav.account}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={link(locale, "/account/orders")} className="cursor-pointer">
            {t.nav.orders}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={link(locale, "/wishlist")} className="cursor-pointer">
            {t.nav.wishlist}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={link(locale, "/account/support")} className="cursor-pointer">
            {t.nav.support}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout} disabled={pending} className="text-destructive">
          <LogOut className="h-4 w-4 rtl:-scale-x-100" />
          {t.nav.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MobileMenu({ locale }: { locale: Locale }) {
  const t = useI18n().t;
  const [open, setOpen] = useState(false);

  const items = [
    { href: "/catalog", label: t.nav.catalog },
    { href: "/category/laptops", label: t.nav.laptops },
    { href: "/category/desktops", label: t.nav.desktops },
    { href: "/category/components", label: t.nav.components },
    { href: "/category/accessories", label: t.nav.accessories },
    { href: "/category/spare-parts", label: t.nav.spareParts },
    { href: "/wishlist", label: t.nav.wishlist },
    { href: "/compare", label: t.nav.compare },
    { href: "/account/support", label: t.nav.support },
  ];

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        aria-label={t.nav.menu}
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
      >
        <Menu className="h-5 w-5" />
      </Button>
      {open && (
        <div id="mobile-menu-panel" className="absolute inset-x-0 top-full z-40 max-h-[calc(100vh-4rem)] overflow-y-auto border-b bg-background p-4 shadow-lg">
          <div className="container grid gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={link(locale, item.href)}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={link(locale, "/account")}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent"
            >
              {t.nav.account}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
