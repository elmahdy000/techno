import Link from "next/link";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { CompareButton } from "@/components/product/compare-button";
import { WishlistButton } from "@/components/product/wishlist-button";
import { Price, discountPercent } from "@/components/product/price";
import { Rating } from "@/components/product/rating";
import { Badge } from "@/components/ui/badge";
import { getDictionary } from "@/i18n/get-dictionary";
import { productStatusLabel } from "@/components/order/status";
import { link, pickL } from "@/lib/links";
import { cn } from "@/lib/utils";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  nameAr: string | null;
  brand: string;
  rating: number;
  ratingCount: number;
  status: string;
  images: Array<{ url: string; alt: string | null }>;
  variants: Array<{ id: string; price: number; compareAtPrice: number | null; stock: number; active: boolean }>;
};

export function ProductCard({
  product,
  locale,
  inWishlist = false,
  className,
}: {
  product: ProductCardData;
  locale: string;
  inWishlist?: boolean;
  className?: string;
}) {
  const minVariant = product.variants
    .filter((v) => v.active)
    .sort((a, b) => a.price - b.price)[0];
  const image = product.images[0];
  const discount = discountPercent(minVariant?.price ?? 0, minVariant?.compareAtPrice);
  const totalStock = product.variants.reduce((a, v) => a + v.stock, 0);
  const href = link(locale, `/product/${product.slug}`);
  const t = getDictionary(locale);

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl",
        className,
      )}
    >
      <Link href={href} className="relative block aspect-square overflow-hidden bg-muted">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={image.alt ?? product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-3xl text-muted-foreground/30">
            {product.brand.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="absolute start-2 top-2 flex flex-col items-start gap-1">
          {discount ? (
            <Badge className="bg-primary px-2 py-0.5 text-[11px] text-primary-foreground shadow-sm">
              -{discount}%
            </Badge>
          ) : null}
          {product.status !== "ACTIVE" ? (
            <Badge variant="secondary" className="text-[11px]">
              {productStatusLabel(product.status, t)}
            </Badge>
          ) : null}
        </div>
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{product.brand}</p>
        <Link href={href} className="line-clamp-2 min-h-10 text-sm font-medium hover:text-primary hover:underline">
          {pickL(locale, product.name, product.nameAr)}
        </Link>
        <Rating value={product.rating} count={product.ratingCount} />
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          {minVariant ? (
            <Price
              price={minVariant.price}
              compareAtPrice={minVariant.compareAtPrice}
              short
              locale={locale}
            />
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          {minVariant && minVariant.active ? (
            <AddToCartButton variantId={minVariant.id} stock={minVariant.stock} className="flex-1">
              {totalStock <= 0 ? "—" : undefined}
            </AddToCartButton>
          ) : (
            <Link
              href={href}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-md border px-3 text-xs font-medium hover:bg-accent"
            >
              {t.common.view}
            </Link>
          )}
          <WishlistButton productId={product.id} initialInWishlist={inWishlist} />
          <CompareButton productId={product.id} />
        </div>
      </div>
    </div>
  );
}
