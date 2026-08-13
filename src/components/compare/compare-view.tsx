"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { link } from "@/lib/links";
import { formatMoneyClient } from "@/lib/client-money";
import { readCompare } from "@/components/product/compare-button";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { Rating } from "@/components/product/rating";
import { Button } from "@/components/ui/button";

type CompareProduct = {
  id: string;
  slug: string;
  name: string;
  nameAr: string | null;
  brand: string;
  rating: number;
  ratingCount: number;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  image: string | null;
  defaultVariantId: string | null;
  category: { name: string; nameAr: string | null };
  specs: Array<{ name: string; nameAr: string | null; value: string; unit: string | null }>;
};

export function CompareView() {
  const { locale, t } = useI18n();
  const [products, setProducts] = useState<CompareProduct[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const ids = readCompare();
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/products?ids=${ids.join(",")}`);
      const json = (await res.json()) as { products: CompareProduct[] };
      setProducts(json.products);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const specNames = useMemo(() => {
    const names = new Map<string, { name: string; nameAr: string | null }>();
    for (const p of products) {
      for (const s of p.specs) {
        if (!names.has(s.name)) names.set(s.name, { name: s.name, nameAr: s.nameAr });
      }
    }
    return Array.from(names.entries());
  }, [products]);

  function remove(id: string) {
    const next = readCompare().filter((x) => x !== id);
    window.localStorage.setItem("tm_compare", JSON.stringify(next));
    load();
  }

  if (loading) {
    return <p className="py-24 text-center text-muted-foreground">{t.common.loading}</p>;
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-medium">{t.product.compareEmpty}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t.product.compareStart}</p>
        <Button asChild className="mt-6">
          <Link href={link(locale, "/catalog")}>{t.cart.startShopping}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-40 p-3 text-start align-top text-muted-foreground">
              {t.product.compareTitle}
            </th>
            {products.map((p) => (
              <th key={p.id} className="min-w-48 p-3 text-start align-top">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    className="absolute end-0 top-0 rounded p-1 text-muted-foreground hover:bg-accent"
                    aria-label={t.cart.remove}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <Link href={link(locale, `/product/${p.slug}`)} className="group">
                    <div className="h-32 overflow-hidden rounded-md bg-muted">
                      {p.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 font-medium group-hover:underline">
                      {locale === "ar" && p.nameAr ? p.nameAr : p.name}
                    </p>
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {locale === "ar" && p.category.nameAr ? p.category.nameAr : p.category.name}
                  </p>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border-t p-3 font-medium text-muted-foreground">{t.filters.brand}</td>
            {products.map((p) => (
              <td key={p.id} className="border-t p-3">
                {p.brand}
              </td>
            ))}
          </tr>
          <tr>
            <td className="border-t p-3 font-medium text-muted-foreground">{t.common.price}</td>
            {products.map((p) => (
              <td key={p.id} className="border-t p-3 font-bold">
                {formatMoneyClient(p.price)}
                {p.compareAtPrice && p.compareAtPrice > p.price && (
                  <span className="ms-2 text-xs font-normal text-muted-foreground line-through">
                    {formatMoneyClient(p.compareAtPrice)}
                  </span>
                )}
              </td>
            ))}
          </tr>
          <tr>
            <td className="border-t p-3 font-medium text-muted-foreground">{t.common.reviews}</td>
            {products.map((p) => (
              <td key={p.id} className="border-t p-3">
                <Rating value={p.rating} count={p.ratingCount} />
              </td>
            ))}
          </tr>
          <tr>
            <td className="border-t p-3 font-medium text-muted-foreground">{t.common.quantity}</td>
            {products.map((p) => (
              <td key={p.id} className="border-t p-3">
                {p.stock > 0 ? t.common.inStock : t.product.outOfStock}
              </td>
            ))}
          </tr>
          {specNames.map(([name, meta]) => (
            <tr key={name}>
              <td className="border-t p-3 font-medium text-muted-foreground">
                {locale === "ar" && meta.nameAr ? meta.nameAr : meta.name}
              </td>
              {products.map((p) => {
                const spec = p.specs.find((s) => s.name === name);
                return (
                  <td key={p.id} className="border-t p-3">
                    {spec ? `${spec.value}${spec.unit ? ` ${spec.unit}` : ""}` : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td className="border-t p-3" />
            {products.map((p) => (
              <td key={p.id} className="border-t p-3">
                {p.defaultVariantId ? (
                  <AddToCartButton variantId={p.defaultVariantId} stock={p.stock} className="w-full">
                    {t.product.addToCart}
                  </AddToCartButton>
                ) : null}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
