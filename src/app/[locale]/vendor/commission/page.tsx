import { getDictionary } from "@/i18n/get-dictionary";
import { getCurrentVendor } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDefaultCommissionRate, getVendorCommissionRate } from "@/lib/commerce";
import { formatMoney } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Commission" };

export default async function VendorCommissionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const vendor = await getCurrentVendor();
  if (!vendor) return null;

  const [defaultRate, items] = await Promise.all([
    getDefaultCommissionRate(),
    prisma.orderItem.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { order: { select: { orderNumber: true, placedAt: true } } },
    }),
  ]);

  const rate = getVendorCommissionRate(vendor, defaultRate);
  const gross = items.reduce((a, i) => a + i.lineTotal, 0);
  const commission = items.reduce((a, i) => a + i.commissionAmount, 0);
  const net = items.reduce((a, i) => a + i.vendorNet, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.vendor.commission}</h1>
        <p className="text-sm text-muted-foreground">{t.vendor.commissionBreakdown}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.vendor.defaultCommission}</p>
            <p className="text-2xl font-bold">{(defaultRate * 100).toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.vendor.yourCommission}</p>
            <p className="text-2xl font-bold">{(rate * 100).toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.vendor.grossAmount}</p>
            <p className="text-2xl font-bold">{formatMoney(gross)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.vendor.netAmount}</p>
            <p className="text-2xl font-bold text-success">{formatMoney(net)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.vendor.commissionBreakdown}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.date}</TableHead>
                <TableHead>{t.order.orderNumber}</TableHead>
                <TableHead>{t.vendor.grossAmount}</TableHead>
                <TableHead>{t.vendor.commissionAmount}</TableHead>
                <TableHead>{t.vendor.netAmount}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(i.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
                  </TableCell>
                  <TableCell>#{i.order.orderNumber}</TableCell>
                  <TableCell>{formatMoney(i.lineTotal)}</TableCell>
                  <TableCell className="text-destructive">-{formatMoney(i.commissionAmount)}</TableCell>
                  <TableCell className="font-medium">{formatMoney(i.vendorNet)}</TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    {t.vendor.noOrders}
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
