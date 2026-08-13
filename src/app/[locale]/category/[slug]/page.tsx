import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCategoryBySlug, queryProducts } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { pickL, link } from "@/lib/links";
import { ProductCard } from "@/components/product/product-card";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  return { title: category?.name ?? "Category" };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = getDictionary(locale);
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const user = await getCurrentUser();
  let wishlist = new Set<string>();
  if (user) {
    const rows = await prisma.wishlistItem.findMany({
      where: { userId: user.id },
      select: { productId: true },
    });
    wishlist = new Set(rows.map((r) => r.productId));
  }

  const { products } = await queryProducts({ categorySlug: slug, pageSize: 24 });

  return (
    <div className="container py-6">
      <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={link(locale, "/")} className="hover:text-foreground">
          {t.nav.home}
        </Link>
        <span>/</span>
        <span>{pickL(locale, category.name, category.nameAr)}</span>
      </nav>

      <div className="mb-6 rounded-xl bg-muted/40 p-6">
        <h1 className="text-2xl font-bold">{pickL(locale, category.name, category.nameAr)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {pickL(locale, category.description, category.descriptionAr)}
        </p>
      </div>

      {category.children.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {category.children.map((c) => (
            <Link key={c.id} href={link(locale, `/category/${c.slug}`)}>
              <Badge variant="secondary" className="cursor-pointer px-3 py-1.5 text-sm hover:bg-accent">
                {pickL(locale, c.name, c.nameAr)}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24">
          <p className="text-lg font-medium">{t.common.noResults}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              locale={locale}
              inWishlist={wishlist.has(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
