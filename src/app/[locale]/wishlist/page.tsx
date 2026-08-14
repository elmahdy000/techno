import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDictionary, pageTitle } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { link } from "@/lib/links";
import { ProductCard } from "@/components/product/product-card";
import { AddWishlistToCart } from "@/components/product/add-wishlist-to-cart";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: pageTitle(locale, "wishlist") };
}

export default async function WishlistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));

  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    include: {
      product: {
        include: {
          images: { orderBy: { position: "asc" }, take: 1 },
          variants: { select: { id: true, price: true, compareAtPrice: true, stock: true, active: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.wishlist.title}</h1>
        {items.length > 0 && <AddWishlistToCart />}
      </div>

      {items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-lg border border-dashed py-24 text-center">
          <p className="text-lg font-medium">{t.wishlist.empty}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t.wishlist.emptyHint}</p>
          <Button asChild className="mt-6">
            <Link href={link(locale, "/catalog")}>{t.cart.startShopping}</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <ProductCard
              key={item.id}
              product={item.product}
              locale={locale}
              inWishlist
            />
          ))}
        </div>
      )}
    </div>
  );
}
