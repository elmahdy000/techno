import { getDictionary } from "@/i18n/get-dictionary";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Admin overview" };

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);

  const [totalOrders, totalUsers, activeVendors, orderItems, gm] = await Promise.all([
    prisma.order.count(),
    prisma.user.count(),
    prisma.vendor.count({ where: { status: "APPROVED" } }),
    prisma.orderItem.findMany({ select: { lineTotal: true } }),
    prisma.order.aggregate({ _sum: { total: true } }),
  ]);

  const gmv = gm._sum.total ?? 0;
  const grossMerchandise = orderItems.reduce((a, i) => a + i.lineTotal, 0);

  const recentOrders = await prisma.order.findMany({
    orderBy: { placedAt: "desc" },
    take: 8,
    include: { user: { select: { name: true, email: true } } },
  });

  const pendingVendors = await prisma.vendor.count({ where: { status: "PENDING" } });
  const pendingWithdrawals = await prisma.withdrawal.count({ where: { status: "PENDING" } });
  const openTickets = await prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } });

  const stats = [
    { label: t.admin.totalOrders, value: String(totalOrders) },
    { label: t.admin.totalUsers, value: String(totalUsers) },
    { label: t.admin.activeVendors, value: String(activeVendors) },
    { label: t.admin.grossMerchandise, value: formatMoney(grossMerchandise) },
    { label: t.admin.platformRevenue, value: formatMoney(gmv) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.admin.overview}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-lg font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Vendors pending</p>
            <p className="mt-1 text-2xl font-bold">{pendingVendors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Withdrawals pending</p>
            <p className="mt-1 text-2xl font-bold">{pendingWithdrawals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Open tickets</p>
            <p className="mt-1 text-2xl font-bold">{openTickets}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-semibold">Recent orders</p>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.vendor.noOrders}</p>
          ) : (
            <ul className="divide-y">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">#{o.orderNumber}</p>
                    <p className="truncate text-xs text-muted-foreground">{o.user.name}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-semibold">{formatMoney(o.total)}</p>
                    <p className="text-xs text-muted-foreground">{o.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
