import { getDictionary } from "@/i18n/get-dictionary";
import { prisma } from "@/lib/prisma";
import { link } from "@/lib/links";
import { formatMoney } from "@/lib/money";
import { statusBadge, payStatusLabel } from "@/components/order/status";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Admin orders" };

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { locale } = await params;
  const { status, q } = await searchParams;
  const t = getDictionary(locale);

  const statusFilter =
    status && ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "PARTIALLY_SHIPPED", "DELIVERED", "CANCELLED"].includes(status)
      ? status
      : undefined;

  const orders = await prisma.order.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter as never } : {}),
      ...(q
        ? {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" } },
              { user: { email: { contains: q, mode: "insensitive" } } },
              { user: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { placedAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { items: true } },
    },
  });

  const tabs = [
    { key: undefined, label: t.common.all },
    { key: "PENDING", label: t.order.statusPending },
    { key: "CONFIRMED", label: t.order.statusConfirmed },
    { key: "PROCESSING", label: t.order.statusProcessing },
    { key: "SHIPPED", label: t.order.statusShipped },
    { key: "DELIVERED", label: t.order.statusDelivered },
    { key: "CANCELLED", label: t.order.statusCancelled },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.admin.orders}</h1>
        <p className="text-sm text-muted-foreground">{orders.length} orders</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const href =
            tab.key === undefined
              ? link(locale, "/admin/orders")
              : link(locale, `/admin/orders?status=${tab.key}`);
          const isActive = tab.key === undefined ? !statusFilter : statusFilter === tab.key;
          return (
            <a
              key={tab.key ?? "all"}
              href={href}
              className={
                isActive
                  ? "rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                  : "rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
              }
            >
              {tab.label}
            </a>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.order.orderNumber}</TableHead>
                <TableHead>{t.common.name}</TableHead>
                <TableHead>{t.common.date}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                <TableHead>{t.common.amount}</TableHead>
                <TableHead className="text-end">{t.common.viewDetails}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <a
                      href={link(locale, `/admin/orders/${o.id}`)}
                      className="font-medium hover:underline"
                    >
                      #{o.orderNumber}
                    </a>
                  </TableCell>
                  <TableCell className="text-xs">
                    <p className="font-medium">{o.user.name}</p>
                    <p className="text-muted-foreground">{o.user.email}</p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(o.placedAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {statusBadge(o.status, t, "sm")}
                      <Badge variant="outline" className="text-[10px]">
                        {payStatusLabel(o.paymentStatus, t)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-semibold">{formatMoney(o.total)}</TableCell>
                  <TableCell className="text-end">
                    <a
                      href={link(locale, `/admin/orders/${o.id}`)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {t.common.viewDetails}
                    </a>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    {t.common.none}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
