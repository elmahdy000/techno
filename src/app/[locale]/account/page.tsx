import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, pageTitle } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { link } from "@/lib/links";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { statusBadge } from "@/components/order/status";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: pageTitle(locale, "account") };
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) return null;

  const [recentOrders, addresses, wishlistCount] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      include: { items: { take: 3 } },
      orderBy: { placedAt: "desc" },
      take: 5,
    }),
    prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
    prisma.wishlistItem.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {t.auth.welcome.replace("{name}", user.name.split(" ")[0])}
      </h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.account.orders}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.order.noOrders}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2">
                    <Link href={link(locale, `/account/orders/${o.id}`)} className="truncate hover:underline">
                      {o.orderNumber}
                    </Link>
                    <span className="flex items-center gap-2">
                      {statusBadge(o.status, t, "sm")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="ghost" size="sm" className="mt-3">
              <Link href={link(locale, "/account/orders")}>{t.order.title}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.account.addresses}</CardTitle>
          </CardHeader>
          <CardContent>
            {addresses.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.checkout.selectAddress}</p>
            ) : (
              <div className="space-y-2 text-sm">
                {addresses.map((a) => (
                  <div key={a.id} className="rounded-md bg-muted/40 p-2">
                    <p className="font-medium">{a.fullName}</p>
                    <p className="text-muted-foreground">
                      {a.line1}, {a.city}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Button asChild variant="ghost" size="sm" className="mt-3">
              <Link href={link(locale, "/account/addresses")}>{t.checkout.newAddress}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={link(locale, "/wishlist")}>{t.wishlist.title} ({wishlistCount})</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={link(locale, "/account/returns")}>{t.returns.title}</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={link(locale, "/account/support")}>{t.account.support}</Link>
        </Button>
      </div>
    </div>
  );
}
