import { getDictionary } from "@/i18n/get-dictionary";
import { prisma } from "@/lib/prisma";
import { getDefaultCommissionRate, getVendorCommissionRate } from "@/lib/commerce";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DefaultCommissionForm,
  VendorCommissionForm,
} from "@/components/admin/commission-form";

export const metadata = { title: "Commission settings" };

export default async function AdminCommissionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);

  const defaultRate = await getDefaultCommissionRate();

  const vendors = await prisma.vendor.findMany({
    where: { status: "APPROVED" },
    orderBy: { name: "asc" },
    include: {
      user: { select: { email: true } },
      _count: { select: { orderItems: true } },
      wallet: true,
    },
  });

  const aggregate = await prisma.orderItem.aggregate({
    _sum: { lineTotal: true, commissionAmount: true, vendorNet: true },
  });

  const gross = aggregate._sum.lineTotal ?? 0;
  const commission = aggregate._sum.commissionAmount ?? 0;
  const net = aggregate._sum.vendorNet ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.admin.commission}</h1>
        <p className="text-sm text-muted-foreground">{t.admin.commissionHint}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.vendor.grossAmount}</p>
            <p className="mt-1 text-2xl font-bold">{formatMoney(gross)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.vendor.commissionAmount}</p>
            <p className="mt-1 text-2xl font-bold text-destructive">{formatMoney(commission)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.vendor.netAmount}</p>
            <p className="mt-1 text-2xl font-bold text-success">{formatMoney(net)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.admin.defaultCommissionRate}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <DefaultCommissionForm locale={locale} currentRate={defaultRate} />
            <Badge variant="outline" className="text-xs">
              {(defaultRate * 100).toFixed(1)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.admin.vendorCommissionRates}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.name}</TableHead>
                <TableHead>{t.common.email}</TableHead>
                <TableHead>{t.vendor.totalOrders}</TableHead>
                <TableHead>{t.admin.currentCommission}</TableHead>
                <TableHead className="text-end">{t.common.edit}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((v) => {
                const rate = getVendorCommissionRate(v, defaultRate);
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell className="text-xs">{v.user.email}</TableCell>
                    <TableCell className="text-xs">{v._count.orderItems}</TableCell>
                    <TableCell>
                      <Badge variant={v.commissionRate != null ? "default" : "outline"}>
                        {(rate * 100).toFixed(1)}%
                        {v.commissionRate != null && <span className="ms-1 text-[9px]">custom</span>}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <VendorCommissionForm
                        locale={locale}
                        vendorId={v.id}
                        currentRate={v.commissionRate}
                        defaultRate={defaultRate}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {vendors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
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
