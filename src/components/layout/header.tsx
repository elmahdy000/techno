import Link from "next/link";
import { Bell, Cpu, Heart, ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { link } from "@/lib/links";
import { getDictionary } from "@/i18n/get-dictionary";
import { SearchBar } from "@/components/layout/search-bar";
import { LocaleSwitcher, UserMenu, MobileMenu } from "@/components/layout/user-menu";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";

export async function Header({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const user = await getCurrentUser();

  let cartCount = 0;
  let wishlistCount = 0;
  let notifCount = 0;
  if (user) {
    const [cart, wishlist, unread] = await Promise.all([
      prisma.cart.findUnique({
        where: { userId: user.id },
        select: { items: { select: { quantity: true } } },
      }),
      prisma.wishlistItem.count({ where: { userId: user.id } }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);
    cartCount = cart?.items.reduce((a, i) => a + i.quantity, 0) ?? 0;
    wishlistCount = wishlist;
    notifCount = unread;
  }

  const topCategories = await prisma.category.findMany({
    where: { parentId: null, active: true },
    orderBy: { sortOrder: "asc" },
    take: 6,
  });

  const nav = [
    { href: "/catalog", label: t.nav.catalog },
    ...topCategories.map((c) => ({
      href: `/category/${c.slug}`,
      label: locale === "ar" && c.nameAr ? c.nameAr : c.name,
    })),
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-4">
        <Link
          href={link(locale, "/")}
          className="flex shrink-0 items-center gap-2 font-bold tracking-tight"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Cpu className="h-5 w-5" />
          </span>
          <span className="text-lg">{t.brand.name}</span>
        </Link>

        <div className="hidden max-w-md flex-1 md:block">
          <SearchBar />
        </div>

        <nav className="ms-auto hidden items-center gap-1 lg:flex">
          {nav.slice(0, 5).map((n) => (
            <Link
              key={n.href}
              href={link(locale, n.href)}
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1 lg:ms-0">
          <LocaleSwitcher />
          {user && (
            <Link
              href={link(locale, "/account/notifications")}
              className={cn(
                "relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent",
              )}
              aria-label={t.nav.notifications}
            >
              <Bell className="h-4 w-4" />
              {notifCount > 0 && (
                <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </Link>
          )}
          <Link
            href={link(locale, "/wishlist")}
            className={cn(
              "relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent",
            )}
            aria-label={t.nav.wishlist}
          >
            <Heart className="h-4 w-4" />
            {wishlistCount > 0 && (
              <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {wishlistCount}
              </span>
            )}
          </Link>
          <Link
            href={link(locale, "/cart")}
            className={cn(
              "relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent",
            )}
            aria-label={t.nav.cart}
          >
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
          <div className="ms-1 hidden sm:block">
            <UserMenu
              signedIn={!!user}
              name={user?.name}
              email={user?.email}
              role={user?.role}
              locale={locale}
            />
          </div>
        </div>

        <div className="sm:hidden">
          <UserMenu
            signedIn={!!user}
            name={user?.name}
            email={user?.email}
            role={user?.role}
            locale={locale}
          />
        </div>

        <MobileMenu locale={locale} />
      </div>
      <div className="container pb-3 md:hidden">
        <SearchBar />
      </div>
    </header>
  );
}
