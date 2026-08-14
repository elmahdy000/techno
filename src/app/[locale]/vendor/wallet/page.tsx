import { getDictionary, pageTitle } from "@/i18n/get-dictionary";
import { getCurrentVendor } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WithdrawalDialog } from "@/components/vendor/withdrawal-dialog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return { title: pageTitle(locale, "vendorWallet") };
}

export default async function VendorWalletPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const vendor = await getCurrentVendor();
  if (!vendor) return null;

  const wallet = await prisma.wallet.findUnique({ where: { vendorId: vendor.id } });
  const recent = await prisma.ledgerEntry.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.vendor.wallet}</h1>
        </div>
        <WithdrawalDialog locale={locale} maxMinor={wallet?.availableBalance ?? 0} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.vendor.availableBalance}</p>
            <p className="mt-1 text-2xl font-bold text-success">
              {formatMoney(wallet?.availableBalance ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.vendor.pendingBalance}</p>
            <p className="mt-1 text-2xl font-bold">{formatMoney(wallet?.pendingBalance ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.vendor.lifetimeEarned}</p>
            <p className="mt-1 text-2xl font-bold">{formatMoney(wallet?.lifetimeEarned ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.vendor.ledger}</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.vendor.noOrders}</p>
          ) : (
            <ul className="divide-y">
              {recent.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium">{e.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.type} · {new Date(e.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className={e.amount >= 0 ? "font-semibold text-success" : "font-semibold text-destructive"}>
                      {e.amount >= 0 ? "+" : ""}
                      {formatMoney(e.amount)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatMoney(e.balanceAfter)}
                    </span>
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
