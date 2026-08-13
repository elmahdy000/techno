import { getDictionary } from "@/i18n/get-dictionary";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { WithdrawalDecisionButtons } from "@/components/admin/withdrawal-decision-buttons";

export const metadata = { title: "Withdrawals" };

const STATUS_VARIANT: Record<string, "secondary" | "success" | "default" | "outline" | "destructive"> = {
  PENDING: "secondary",
  APPROVED: "default",
  PROCESSING: "outline",
  PAID: "success",
  REJECTED: "destructive",
  CANCELLED: "outline",
};

export default async function AdminWithdrawalsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);

  const withdrawals = await prisma.withdrawal.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { vendor: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.admin.withdrawals}</h1>
        <p className="text-sm text-muted-foreground">{withdrawals.length} requests</p>
      </div>

      <div className="space-y-3">
        {withdrawals.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              {t.common.none}
            </CardContent>
          </Card>
        ) : (
          withdrawals.map((w) => {
            const details = (w.accountDetails as { info?: string }) ?? {};
            return (
              <Card key={w.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{formatMoney(w.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.vendor.name} · {w.method} ·{" "}
                        {new Date(w.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
                      </p>
                      {details.info && (
                        <p className="mt-1 max-w-md truncate text-xs text-muted-foreground" dir="ltr">
                          {details.info}
                        </p>
                      )}
                      {w.requestNote && (
                        <p className="mt-1 text-xs text-muted-foreground">{w.requestNote}</p>
                      )}
                    </div>
                    <Badge variant={STATUS_VARIANT[w.status]}>{w.status}</Badge>
                  </div>
                  {w.status === "PENDING" && (
                    <div className="mt-3 border-t pt-3">
                      <WithdrawalDecisionButtons locale={locale} withdrawalId={w.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
