import { getDictionary } from "@/i18n/get-dictionary";
import { getCurrentVendor } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DeliverButton, ShipDialog } from "@/components/vendor/fulfillment-buttons";

export const metadata = { title: "Vendor orders" };

export default async function VendorOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const vendor = await getCurrentVendor();
  if (!vendor) return null;

  const shipments = await prisma.orderShipment.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: "desc" },
    include: {
      order: { select: { orderNumber: true, paymentStatus: true, status: true } },
      items: { select: { id: true, productName: true, variantName: true, quantity: true, vendorNet: true, sku: true } },
    },
  });

  const pendingShipments = shipments.filter((s) => s.status === "PENDING").length;
  const shipped = shipments.filter((s) => s.status === "SHIPPED").length;
  const delivered = shipments.filter((s) => s.status === "DELIVERED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.vendor.orders}</h1>
          <p className="text-sm text-muted-foreground">
            {pendingShipments} {t.vendor.newOrder} · {shipped} {t.order.statusShipped} · {delivered}{" "}
            {t.order.statusDelivered}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.vendor.newOrder}</p>
            <p className="text-2xl font-bold">{pendingShipments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.order.statusShipped}</p>
            <p className="text-2xl font-bold">{shipped}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.order.statusDelivered}</p>
            <p className="text-2xl font-bold">{delivered}</p>
          </CardContent>
        </Card>
      </div>

      {shipments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {t.vendor.noOrders}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {shipments.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">#{s.order.orderNumber}</p>
                    <Badge variant="secondary">{s.status}</Badge>
                    {s.trackingNumber && (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {s.trackingCarrier ? `${s.trackingCarrier}: ` : ""}
                        {s.trackingNumber}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {s.status === "PENDING" && (
                      <>
                        <ShipDialog locale={locale} shipmentId={s.id} />
                        <DeliverButton locale={locale} shipmentId={s.id} />
                      </>
                    )}
                    {s.status === "SHIPPED" && <DeliverButton locale={locale} shipmentId={s.id} />}
                    {s.status === "DELIVERED" && (
                      <Badge variant="success">{t.order.statusDelivered}</Badge>
                    )}
                  </div>
                </div>

                <div className="mt-3 overflow-hidden rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-start">{t.common.name}</th>
                        <th className="px-3 py-2 text-start">{t.common.sku}</th>
                        <th className="px-3 py-2 text-end">{t.common.quantity}</th>
                        <th className="px-3 py-2 text-end">{t.vendor.netAmount}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.items.map((i) => (
                        <tr key={i.id} className="border-t">
                          <td className="px-3 py-2">
                            {i.productName}
                            {i.variantName ? <span className="text-muted-foreground"> · {i.variantName}</span> : null}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{i.sku}</td>
                          <td className="px-3 py-2 text-end">{i.quantity}</td>
                          <td className="px-3 py-2 text-end font-medium">{formatMoney(i.vendorNet)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
