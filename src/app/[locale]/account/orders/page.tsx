import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, pageTitle } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { link } from "@/lib/links";
import { formatMoney } from "@/lib/money";
import { statusBadge, payStatusLabel } from "@/components/order/status";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: pageTitle(locale, "accountOrders") };
}

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) return null;

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { placedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.order.title}</h1>

      {orders.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {t.order.noOrders}
          </CardContent>
        </Card>
      )}

      {orders.map((o) => (
        <Card key={o.id}>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link
                  href={link(locale, `/account/orders/${o.id}`)}
                  className="font-semibold hover:underline"
                >
                  {t.order.orderNumber} #{o.orderNumber}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.order.placed}:{" "}
                  {new Date(o.placedAt).toLocaleDateString(
                    locale === "ar" ? "ar-EG" : "en-US",
                    { day: "numeric", month: "short", year: "numeric" },
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {statusBadge(o.status, t)}
                <Badge variant="outline">{payStatusLabel(o.paymentStatus, t)}</Badge>
                <span className="text-sm font-bold">{formatMoney(o.total, undefined, locale)}</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {o.items.slice(0, 4).map((i) => (
                <div key={i.id} className="relative h-12 w-12 overflow-hidden rounded-md bg-muted">
                  {i.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.imageUrl} alt={i.productName} className="h-full w-full object-cover" />
                  )}
                </div>
              ))}
              {o.items.length > 4 && (
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-muted text-xs font-medium">
                  +{o.items.length - 4}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
