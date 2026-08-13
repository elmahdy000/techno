import { getDictionary } from "@/i18n/get-dictionary";
import { prisma } from "@/lib/prisma";
import { pickL, link } from "@/lib/links";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Rating } from "@/components/product/rating";
import { ReviewModerationButtons } from "@/components/admin/review-moderation-buttons";

export const metadata = { title: "Review moderation" };

const STATUS_VARIANT: Record<string, "secondary" | "success" | "destructive"> = {
  PENDING: "secondary",
  PUBLISHED: "success",
  REJECTED: "destructive",
};

export default async function AdminReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  const { status } = await searchParams;
  const t = getDictionary(locale);

  const statusFilter =
    status && ["PENDING", "PUBLISHED", "REJECTED"].includes(status) ? status : undefined;

  const reviews = await prisma.review.findMany({
    where: statusFilter ? { status: statusFilter as never } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { name: true } },
      product: { select: { name: true, nameAr: true, slug: true } },
    },
  });

  const pendingCount = await prisma.review.count({ where: { status: "PENDING" } });

  const tabs = [
    { key: undefined, label: t.common.all },
    { key: "PENDING", label: `Pending (${pendingCount})` },
    { key: "PUBLISHED", label: "Published" },
    { key: "REJECTED", label: "Rejected" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.admin.reviews}</h1>
        <p className="text-sm text-muted-foreground">{reviews.length} reviews</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const href =
            tab.key === undefined
              ? link(locale, "/admin/reviews")
              : link(locale, `/admin/reviews?status=${tab.key}`);
          const isActive = tab.key === undefined ? !statusFilter : statusFilter === tab.key;
          return (
            <a
              key={tab.key ?? "all"}
              href={href}
              className={
                isActive
                  ? "rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                  : "rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
              }
            >
              {tab.label}
            </a>
          );
        })}
      </div>

      <div className="space-y-3">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              {t.common.none}
            </CardContent>
          </Card>
        ) : (
          reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Rating value={r.rating} />
                    <span className="text-sm font-medium">{r.user.name}</span>
                    {r.isVerifiedPurchase && (
                      <span className="text-xs text-success">{t.common.verified}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
                    </span>
                  </div>
                </div>
                {r.title && <p className="mt-2 text-sm font-medium">{r.title}</p>}
                <p className="mt-1 text-sm">{r.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pickL(locale, r.product.name, r.product.nameAr)}
                </p>
                <div className="mt-3 border-t pt-3">
                  <ReviewModerationButtons locale={locale} reviewId={r.id} status={r.status} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
