import type { Metadata } from "next";
import { getDictionary, pageTitle } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: pageTitle(locale, "accountReturns") };
}

const RETURN_STATUS_KEY: Record<string, string> = {
  PENDING: "statusPending",
  APPROVED: "statusApproved",
  REJECTED: "statusRejected",
  AWAITING_ITEM: "statusAwaitingItem",
  ITEM_RECEIVED: "statusItemReceived",
  REFUNDED: "statusRefunded",
  CLOSED: "statusClosed",
};

export default async function ReturnsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) return null;

  const returns = await prisma.returnRequest.findMany({
    where: { userId: user.id },
    include: {
      orderItem: { select: { productName: true, imageUrl: true, refundAmount: true, refundStatus: true } },
      refund: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.returns.title}</h1>

      {returns.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {t.account.noReturns}
          </CardContent>
        </Card>
      )}

      {returns.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-md bg-muted">
                  {r.orderItem.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.orderItem.imageUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{r.orderItem.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.returns.reason}: {t.returns[r.reason as keyof typeof t.returns]}
                  </p>
                </div>
              </div>
              <div className="text-end">
                <Badge variant="secondary">
                  {t.returns[RETURN_STATUS_KEY[r.status] as keyof typeof t.returns] ?? r.status}
                </Badge>
                {r.refund && r.refund.amount > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.returns.refundAmount}: {formatMoney(r.refund.amount, undefined, locale)}
                  </p>
                )}
              </div>
            </div>
            {r.description && (
              <p className="mt-3 rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                {r.description}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
