import Link from "next/link";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { CompareButton } from "@/components/product/compare-button";
import { WishlistButton } from "@/components/product/wishlist-button";
import { Price, discountPercent } from "@/components/product/price";
import { Rating } from "@/components/product/rating";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-lg",
        className,
      )}
    >
      <Link href={href} className="relative block aspect-square overflow-hidden bg-muted">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={image.alt ?? product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : null}
        {discount ? (
          <Badge className="absolute start-2 top-2 bg-destructive text-destructive-foreground">
            -{discount}%
          </Badge>
        ) : null}
        {product.status !== "ACTIVE" ? (
          <Badge variant="secondary" className="absolute start-2 top-2">
            {product.status}
          </Badge>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-xs text-muted-foreground">{product.brand}</p>
        <Link href={href} className="line-clamp-2 min-h-10 text-sm font-medium hover:underline">
          {pickL(locale, product.name, product.nameAr)}
        </Link>
        <Rating value={product.rating} count={product.ratingCount} />
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          {minVariant ? (
            <Price
              price={minVariant.price}
              compareAtPrice={minVariant.compareAtPrice}
              short
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
              className="inline-flex h-8 flex-1 items-center justify-center rounded-md border px-3 text-xs font-medium hover:bg-accent"
            >
              View
            </Link>
          )}
          <WishlistButton productId={product.id} initialInWishlist={inWishlist} />
          <CompareButton productId={product.id} />
        </div>
      </div>
    </div>
  );
}
