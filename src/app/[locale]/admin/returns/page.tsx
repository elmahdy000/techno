import type { Metadata } from "next";
import { getDictionary, pageTitle } from "@/i18n/get-dictionary";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ReturnDecisionButtons } from "@/components/admin/return-decision-buttons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: pageTitle(locale, "adminReturns") };
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

const STATUS_VARIANT: Record<string, "secondary" | "success" | "default" | "outline" | "destructive"> = {
  PENDING: "secondary",
  APPROVED: "default",
  AWAITING_ITEM: "outline",
  ITEM_RECEIVED: "outline",
  REFUNDED: "success",
  REJECTED: "destructive",
  CLOSED: "outline",
};

export default async function AdminReturnsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);

  const returns = await prisma.returnRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      user: { select: { name: true, email: true } },
      orderItem: {
        select: {
          productName: true,
          imageUrl: true,
          unitPrice: true,
          quantity: true,
          lineTotal: true,
          vendorNet: true,
          refundStatus: true,
          order: { select: { orderNumber: true } },
          vendor: { select: { name: true } },
        },
      },
      refund: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.returns.title}</h1>
        <p className="text-sm text-muted-foreground">
          {t.admin.reviewsCount.replace("{count}", String(returns.length))}
        </p>
      </div>

      <div className="space-y-3">
        {returns.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              {t.common.none}
            </CardContent>
          </Card>
        ) : (
          returns.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {r.orderItem.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.orderItem.imageUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.orderItem.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        #{r.orderItem.order.orderNumber} · {r.orderItem.vendor.name} · {r.user.name} (
                        {r.user.email})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.common.quantity}: {r.quantity} ·{" "}
                        {new Date(r.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
                      </p>
                      {r.reason && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t.returns.reason}: {t.returns[r.reason as keyof typeof t.returns]}
                        </p>
                      )}
                      {r.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-end">
                    <Badge variant={STATUS_VARIANT[r.status]}>
                      {t.returns[RETURN_STATUS_KEY[r.status] as keyof typeof t.returns] ?? r.status}
                    </Badge>
                    {r.refund && r.refund.amount > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t.returns.refundAmount}: {formatMoney(r.refund.amount, undefined, locale)}
                      </p>
                    )}
                    {r.adminNote && (
                      <p className="mt-1 text-xs text-muted-foreground">{r.adminNote}</p>
                    )}
                  </div>
                </div>
                {r.status === "PENDING" && (
                  <div className="mt-3 border-t pt-3">
                    <ReturnDecisionButtons locale={locale} returnRequestId={r.id} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
