import Link from "next/link";
import { Banknote, Package, ShoppingBag, Wallet as WalletIcon } from "lucide-react";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCurrentVendor } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { link } from "@/lib/links";
import { formatMoney } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Vendor overview" };

export default async function VendorOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const vendor = await getCurrentVendor();
  if (!vendor) return null;

  const [
    wallet,
    orderItems,
    orderCount,
    productCount,
    lowStock,
    recentOrders,
  ] = await Promise.all([
    prisma.wallet.findUnique({ where: { vendorId: vendor.id } }),
    prisma.orderItem.findMany({ where: { vendorId: vendor.id } }),
    prisma.order.count({ where: { items: { some: { vendorId: vendor.id } } } }),
    prisma.product.count({ where: { vendorId: vendor.id, status: { not: "ARCHIVED" } } }),
    prisma.variant.findMany({
      where: { product: { vendorId: vendor.id, status: { not: "ARCHIVED" } }, active: true },
      orderBy: { stock: "asc" },
      take: 6,
      include: { product: { select: { name: true, slug: true } } },
    }),
    prisma.order.findMany({
      where: { items: { some: { vendorId: vendor.id } } },
      orderBy: { placedAt: "desc" },
      take: 6,
      include: { items: { where: { vendorId: vendor.id } } },
    }),
  ]);

  const gross = orderItems.reduce((a, i) => a + i.lineTotal, 0);
  const commission = orderItems.reduce((a, i) => a + i.commissionAmount, 0);
  const net = orderItems.reduce((a, i) => a + i.vendorNet, 0);

  const stats = [
    {
      label: t.vendor.totalSales,
      value: formatMoney(gross),
      icon: ShoppingBag,
    },
    {
      label: t.vendor.totalOrders,
      value: String(orderCount),
      icon: Package,
    },
    {
      label: t.vendor.commissionPaid,
      value: formatMoney(commission),
      icon: Banknote,
    },
    {
      label: t.vendor.netRevenue,
      value: formatMoney(net),
      icon: WalletIcon,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.vendor.overview}</h1>
          <p className="text-sm text-muted-foreground">{vendor.name}</p>
        </div>
        <Button asChild>
          <Link href={link(locale, "/vendor/products/new")}>{t.vendor.addProduct}</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.vendor.wallet}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.vendor.availableBalance}</span>
              <span className="font-semibold text-success">
                {formatMoney(wallet?.availableBalance ?? 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.vendor.pendingBalance}</span>
              <span className="font-semibold">{formatMoney(wallet?.pendingBalance ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.vendor.lifetimeEarned}</span>
              <span className="font-semibold">{formatMoney(wallet?.lifetimeEarned ?? 0)}</span>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href={link(locale, "/vendor/wallet")}>{t.vendor.requestWithdrawal}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.vendor.lowStock}</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.common.none}</p>
            ) : (
              <ul className="space-y-2">
                {lowStock.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 text-sm">
                    <Link
                      href={link(locale, `/product/${v.product.slug}`)}
                      className="line-clamp-1 hover:underline"
                    >
                      {v.product.name} — {v.name}
                    </Link>
                    <Badge variant={v.stock === 0 ? "destructive" : "secondary"}>
                      {v.stock} {t.vendor.stock}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.vendor.newOrder}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.vendor.noOrders}</p>
          ) : (
            <ul className="divide-y">
              {recentOrders.map((o) => {
                const grossAmount = o.items.reduce((a, i) => a + i.lineTotal, 0);
                const netAmount = o.items.reduce((a, i) => a + i.vendorNet, 0);
                return (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="text-sm font-medium">#{o.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.placedAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {t.vendor.netAmount}: {formatMoney(netAmount)}
                      </span>
                      <Badge variant="secondary">{o.status}</Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
