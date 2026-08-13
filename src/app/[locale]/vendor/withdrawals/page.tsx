import { getDictionary } from "@/i18n/get-dictionary";
import { getCurrentVendor } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Withdrawals" };

const STATUS_KEY: Record<string, string> = {
  PENDING: "withdrawalPending",
  APPROVED: "withdrawalApproved",
  PROCESSING: "withdrawalProcessing",
  PAID: "withdrawalPaid",
  REJECTED: "withdrawalRejected",
  CANCELLED: "withdrawalCancelled",
};

const STATUS_VARIANT: Record<string, "secondary" | "success" | "default" | "outline" | "destructive"> = {
  PENDING: "secondary",
  APPROVED: "default",
  PROCESSING: "outline",
  PAID: "success",
  REJECTED: "destructive",
  CANCELLED: "outline",
};

export default async function VendorWithdrawalsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const vendor = await getCurrentVendor();
  if (!vendor) return null;

  const withdrawals = await prisma.withdrawal.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.vendor.withdrawals}</h1>
      </div>

      {withdrawals.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {t.vendor.noOrders}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {withdrawals.map((w) => {
                const key = STATUS_KEY[w.status] ?? "withdrawalPending";
                const details = (w.accountDetails as { info?: string }) ?? {};
                return (
                  <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-semibold">{formatMoney(w.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.method} · {new Date(w.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
                      </p>
                      {details.info && (
                        <p className="mt-1 max-w-md truncate text-xs text-muted-foreground" dir="ltr">
                          {details.info}
                        </p>
                      )}
                      {w.adminNote && (
                        <p className="mt-1 text-xs text-muted-foreground">Note: {w.adminNote}</p>
                      )}
                    </div>
                    <Badge variant={STATUS_VARIANT[w.status]}>
                      {t.vendor[key as keyof typeof t.vendor] as unknown as string}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
