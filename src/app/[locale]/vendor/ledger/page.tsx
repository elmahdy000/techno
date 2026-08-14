import { getDictionary, pageTitle } from "@/i18n/get-dictionary";
import { getCurrentVendor } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return { title: pageTitle(locale, "vendorLedger") };
}

export default async function VendorLedgerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const vendor = await getCurrentVendor();
  if (!vendor) return null;

  const entries = await prisma.ledgerEntry.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.vendor.ledger}</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.date}</TableHead>
                <TableHead>{t.common.details}</TableHead>
                <TableHead>{t.common.amount}</TableHead>
                <TableHead>{t.common.total}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(e.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{e.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.type}
                      {e.reference ? ` · ${e.reference}` : ""}
                    </p>
                  </TableCell>
                  <TableCell
                    className={
                      e.amount >= 0
                        ? "font-medium text-success"
                        : "font-medium text-destructive"
                    }
                  >
                    {e.amount >= 0 ? "+" : ""}
                    {formatMoney(e.amount)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatMoney(e.balanceAfter)}</TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
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
