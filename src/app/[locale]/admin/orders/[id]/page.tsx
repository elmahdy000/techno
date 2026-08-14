import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Package, Truck } from "lucide-react";
import { getDictionary, pageTitle } from "@/i18n/get-dictionary";
import { prisma } from "@/lib/prisma";
import { link } from "@/lib/links";
import { formatMoney } from "@/lib/money";
import { statusBadge, payStatusLabel, shippingStatusLabel } from "@/components/order/status";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: pageTitle(locale, "adminOrderDetails") };
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = getDictionary(locale);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      items: {
        orderBy: { id: "asc" },
        include: {
          vendor: { select: { id: true, name: true } },
          product: { select: { slug: true } },
        },
      },
      shipments: { orderBy: { createdAt: "asc" } },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        include: { changedBy: { select: { name: true } } },
      },
    },
  });
  if (!order) notFound();

  const address = order.address as {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
  };

  const gmv = order.items.reduce((a, i) => a + i.lineTotal, 0);
  const commission = order.items.reduce((a, i) => a + i.commissionAmount, 0);
  const net = order.items.reduce((a, i) => a + i.vendorNet, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={link(locale, "/admin/orders")}
            className="text-sm text-muted-foreground hover:underline"
          >
            {t.admin.orders}
          </Link>
          <h1 className="text-2xl font-bold">{t.order.orderDetails}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.order.orderNumber} #{order.orderNumber} ·{" "}
            {new Date(order.placedAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge(order.status, t)}
          <Badge variant="outline">{payStatusLabel(order.paymentStatus, t)}</Badge>
          <Badge variant="secondary">
            {order.paymentMethod === "COD" ? t.order.cod : t.order.card}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.order.items}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.items.map((i) => (
                <div key={i.id} className="flex flex-wrap gap-4 rounded-lg border p-3">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    {i.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.imageUrl} alt={i.productName} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={link(locale, `/product/${i.product.slug}`)}
                      className="line-clamp-1 text-sm font-medium hover:underline"
                    >
                      {i.productName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {i.variantName} · {i.sku} · {t.common.quantity}: {i.quantity}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{formatMoney(i.lineTotal)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs">
                    <Badge variant="outline">{i.vendor.name}</Badge>
                    <span className="text-muted-foreground">
                      {t.vendor.grossAmount}: {formatMoney(i.lineTotal)}
                    </span>
                    <span className="text-muted-foreground">
                      {t.vendor.commissionAmount}: -{formatMoney(i.commissionAmount)} (
                      {(i.commissionRate * 100).toFixed(1)}%)
                    </span>
                    <span className="text-muted-foreground">
                      {t.vendor.netAmount}: {formatMoney(i.vendorNet)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {order.shipments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4" />
                  {t.order.shipment}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.shipments.map((s) => (
                  <div key={s.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{shippingStatusLabel(s.status, t)}</Badge>
                      {s.trackingNumber && (
                        <span className="text-muted-foreground">
                          {s.trackingCarrier ? `${s.trackingCarrier} · ` : ""}
                          {s.trackingNumber}
                        </span>
                      )}
                    </div>
                    {s.shippedAt && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(s.shippedAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                {t.order.tracking}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.statusHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                <ol className="relative ms-3 space-y-4 border-s ps-5">
                  {order.statusHistory.map((h) => (
                    <li key={h.id} className="relative">
                      <span className="absolute -start-[27px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                      <p className="text-sm font-medium">{h.to}</p>
                      {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                      <p className="text-xs text-muted-foreground">
                        {new Date(h.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}
                        {h.changedBy ? ` · ${h.changedBy.name}` : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.common.email}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium">{order.user.name}</p>
              <p className="text-muted-foreground">{order.user.email}</p>
              {order.user.phone && <p className="text-muted-foreground">{order.user.phone}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.checkout.shippingAddress}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium">{address.fullName}</p>
              <p className="text-muted-foreground">{address.phone}</p>
              <p className="mt-1 text-muted-foreground">{address.line1}</p>
              {address.line2 && <p className="text-muted-foreground">{address.line2}</p>}
              <p className="text-muted-foreground">
                {address.city}
                {address.state ? `, ${address.state}` : ""}
              </p>
              <p className="text-muted-foreground">
                {address.country}
                {address.postalCode ? ` · ${address.postalCode}` : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.cart.orderSummary}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.common.subtotal}</span>
                <span>{formatMoney(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.common.discount}</span>
                  <span>-{formatMoney(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.common.shipping}</span>
                <span>{order.shippingFee === 0 ? t.common.free : formatMoney(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.common.tax}</span>
                <span>{formatMoney(order.taxAmount)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-bold">
                <span>{t.order.totalPaid}</span>
                <span>{formatMoney(order.total)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t.vendor.grossAmount}</span>
                <span>{formatMoney(gmv)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t.vendor.commissionAmount}</span>
                <span className="text-destructive">-{formatMoney(commission)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t.vendor.netAmount}</span>
                <span>{formatMoney(net)}</span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
