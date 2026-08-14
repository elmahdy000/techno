import { getDictionary, pageTitle } from "@/i18n/get-dictionary";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
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
import { VendorActionButtons } from "@/components/admin/vendor-actions";
import { vendorStatusLabel } from "@/components/order/status";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return { title: pageTitle(locale, "adminVendors") };
}

const STATUS_VARIANT: Record<string, "secondary" | "success" | "destructive" | "outline"> = {
  PENDING: "secondary",
  APPROVED: "success",
  SUSPENDED: "destructive",
  REJECTED: "outline",
};

export default async function AdminVendorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);

  const vendors = await prisma.vendor.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      user: { select: { name: true, email: true } },
      wallet: true,
      _count: { select: { products: true, orderItems: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.admin.vendors}</h1>
        <p className="text-sm text-muted-foreground">
          {t.admin.vendorsCount.replace("{count}", String(vendors.length))}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.vendor}</TableHead>
                <TableHead>{t.common.email}</TableHead>
                <TableHead>{t.admin.grossMerchandise}</TableHead>
                <TableHead>{t.vendor.availableBalance}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                <TableHead className="text-end">{t.common.edit}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <p className="font-medium">{v.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.admin.productsCount.replace("{count}", String(v._count.products))} ·{" "}
                      {t.admin.salesCount.replace("{count}", String(v._count.orderItems))}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs">{v.user.email}</TableCell>
                  <TableCell className="text-xs">
                    {formatMoney(
                      v.wallet?.lifetimeEarned ?? 0,
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatMoney(v.wallet?.availableBalance ?? 0)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[v.status]}>{vendorStatusLabel(v.status, t)}</Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <VendorActionButtons locale={locale} vendorId={v.id} status={v.status} />
                  </TableCell>
                </TableRow>
              ))}
              {vendors.length === 0 && (
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
