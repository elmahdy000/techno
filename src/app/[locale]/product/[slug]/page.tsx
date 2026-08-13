import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/i18n/get-dictionary";
import { pickL, link } from "@/lib/links";
import { ImageGallery } from "@/components/product/image-gallery";
import { PurchaseBox } from "@/components/product/purchase-box";
import { WishlistButton } from "@/components/product/wishlist-button";
import { CompareButton } from "@/components/product/compare-button";
import { ProductCard } from "@/components/product/product-card";
import { ReviewForm } from "@/components/product/review-form";
import { Rating } from "@/components/product/rating";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { name: true, shortDescription: true },
  });
  return {
    title: product?.name ?? "Product",
    description: product?.shortDescription ?? undefined,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = getDictionary(locale);

  const product = await prisma.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      category: true,
      attributes: {
        include: { attribute: true },
        orderBy: { attribute: { sortOrder: "asc" } },
      },
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { price: "asc" } },
    },
  });
  if (!product) notFound();

  const user = await getCurrentUser();
  let inWishlist = false;
  let existingReview = null;
  let purchasableOrderItem: string | null = null;

  if (user) {
    const [wish, review, deliveredItem] = await Promise.all([
      prisma.wishlistItem.findUnique({
        where: { userId_productId: { userId: user.id, productId: product.id } },
      }),
      prisma.review.findUnique({
        where: { userId_productId: { userId: user.id, productId: product.id } },
      }),
      prisma.orderItem.findFirst({
        where: {
          productId: product.id,
          order: { userId: user.id, status: { in: ["DELIVERED"] } },
        },
        select: { id: true },
      }),
    ]);
    inWishlist = !!wish;
    existingReview = review;
    purchasableOrderItem = deliveredItem?.id ?? null;
  }

  const [reviews, related] = await Promise.all([
    prisma.review.findMany({
      where: { productId: product.id, status: "PUBLISHED" },
      include: {
        user: { select: { name: true } },
        response: { include: { vendor: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        categoryId: product.categoryId,
        id: { not: product.id },
      },
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        variants: { select: { id: true, price: true, compareAtPrice: true, stock: true, active: true } },
      },
      take: 4,
    }),
  ]);

  const variantList = product.variants.map((v) => ({
    id: v.id,
    name: v.name,
    price: v.price,
    compareAtPrice: v.compareAtPrice,
    stock: v.stock,
    options: (v.options as Record<string, string> | null) ?? null,
  }));

  const name = pickL(locale, product.name, product.nameAr);
  const shortDesc = pickL(locale, product.shortDescription, product.shortDescriptionAr);

  return (
    <div className="container py-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <ImageGallery images={product.images} name={name} />

        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                {product.brand}
                {product.model ? ` · ${product.model}` : ""}
              </p>
              <h1 className="mt-1 text-2xl font-bold lg:text-3xl">{name}</h1>
            </div>
            <div className="flex shrink-0 gap-2">
              <WishlistButton productId={product.id} initialInWishlist={inWishlist} />
              <CompareButton productId={product.id} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Rating value={product.rating} count={product.ratingCount} />
            <span className="text-xs text-muted-foreground">
              {t.product.soldCount.replace("{count}", String(product.soldCount))}
            </span>
          </div>

          {shortDesc && <p className="text-muted-foreground">{shortDesc}</p>}

          <div className="rounded-lg bg-muted/50 p-4">
            <PurchaseBox variants={variantList} />
          </div>

          <div className="space-y-2 rounded-lg border p-4 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4 text-success" />
              {t.product.shippedByPlatform}
            </div>
            <p className="text-muted-foreground">{t.product.platformGuarantee}</p>
            {product.warranty && (
              <p className="mt-1 text-sm">
                <span className="font-medium">{t.product.warranty}:</span>{" "}
                <span className="text-muted-foreground">{product.warranty}</span>
              </p>
            )}
          </div>

          {product.attributes.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-bold">{t.product.specifications}</h2>
              <div className="overflow-hidden rounded-lg border">
                {product.attributes.map((pa, i) => (
                  <div
                    key={pa.id}
                    className={`flex justify-between gap-4 px-4 py-2.5 text-sm ${i % 2 === 0 ? "bg-muted/40" : ""}`}
                  >
                    <span className="text-muted-foreground">
                      {pickL(locale, pa.attribute.name, pa.attribute.nameAr)}
                    </span>
                    <span className="text-end font-medium">
                      {pa.value}
                      {pa.attribute.unit ? ` ${pa.attribute.unit}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {product.description && (
        <>
          <Separator className="my-10" />
          <section>
            <h2 className="text-xl font-bold">{t.product.description}</h2>
            <div className="mt-3 max-w-3xl whitespace-pre-line text-muted-foreground">
              {product.description}
            </div>
          </section>
        </>
      )}

      <Separator className="my-10" />

      <section>
        <h2 className="text-xl font-bold">
          {t.product.reviews.replace("{count}", String(reviews.length))}
        </h2>

        {user && !existingReview && (
          <div className="mt-4 max-w-xl">
            <ReviewForm
              productId={product.id}
              orderItemId={purchasableOrderItem ?? undefined}
              locale={locale}
            />
          </div>
        )}
        {user && existingReview && (
          <p className="mt-4 text-sm text-muted-foreground">{t.product.youReviewed}</p>
        )}

        <div className="mt-6 space-y-4">
          {reviews.length === 0 && (
            <p className="text-sm text-muted-foreground">{t.product.noReviews}</p>
          )}
          {reviews.map((r) => (
            <div key={r.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{r.user.name}</span>
                <Rating value={r.rating} />
                {r.isVerifiedPurchase && (
                  <Badge variant="success">{t.product.verifiedPurchase}</Badge>
                )}
              </div>
              {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
              <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
              {r.response && (
                <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
                  <p className="font-medium">{t.product.vendorReply}</p>
                  <p className="mt-1 text-muted-foreground">{r.response.body}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <>
          <Separator className="my-10" />
          <section>
            <h2 className="mb-5 text-xl font-bold">{t.product.related}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} locale={locale} inWishlist={false} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
