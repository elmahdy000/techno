import { getDictionary, pageTitle } from "@/i18n/get-dictionary";
import { getCurrentVendor } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { pickL } from "@/lib/links";
import { Card, CardContent } from "@/components/ui/card";
import { Rating } from "@/components/product/rating";
import { RespondReviewDialog } from "@/components/vendor/respond-review-dialog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return { title: pageTitle(locale, "vendorReviews") };
}

export default async function VendorReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const vendor = await getCurrentVendor();
  if (!vendor) return null;

  const reviews = await prisma.review.findMany({
    where: { product: { vendorId: vendor.id } },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true } },
      product: { select: { name: true, nameAr: true, slug: true } },
      response: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.vendor.reviews}</h1>
        <p className="text-sm text-muted-foreground">
          {t.admin.reviewsCount.replace("{count}", String(reviews.length))}
        </p>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {t.vendor.noProducts}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
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
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
                  </span>
                </div>
                <p className="mt-2 text-sm">{r.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.vendor.products}: {pickL(locale, r.product.name, r.product.nameAr)}
                </p>
                {r.response ? (
                  <div className="mt-3 rounded-md border bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t.vendor.respondReview}
                    </p>
                    <p className="mt-1 text-sm">{r.response.body}</p>
                    <div className="mt-2">
                      <RespondReviewDialog locale={locale} reviewId={r.id} existing={r.response.body} />
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <RespondReviewDialog locale={locale} reviewId={r.id} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
