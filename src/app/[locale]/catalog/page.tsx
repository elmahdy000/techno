import type { Metadata } from "next";
import { getDictionary } from "@/i18n/get-dictionary";
import { queryProducts, getBrands, getFacetAttributes } from "@/lib/catalog";
import { ProductCard } from "@/components/product/product-card";
import { CatalogFilters } from "@/components/catalog/filters";
import { SortSelect } from "@/components/catalog/sort-select";
import { Pagination } from "@/components/catalog/pagination";
import { MobileFilters } from "@/components/catalog/mobile-filters";

export const metadata: Metadata = { title: "Catalog" };

const PAGE_SIZE = 24;

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = getDictionary(locale);

  const q = (sp.q as string) ?? "";
  const category = (sp.category as string) ?? "";
  const brands = (sp.brand as string[] | undefined) ?? [];
  const attrFilters: Record<string, string> = {};
  const facets = await getFacetAttributes(category || undefined);
  for (const f of facets) {
    const v = sp[`attr.${f.slug}`];
    if (typeof v === "string" && v) attrFilters[f.slug] = v;
  }

  const page = Math.max(1, Number(sp.page) || 1);

  const [result, allBrands] = await Promise.all([
    queryProducts({
      q: q || undefined,
      categorySlug: category || undefined,
      brands: Array.isArray(brands) && brands.length ? brands : undefined,
      attrFilters,
      minPrice: sp.min ? Number(sp.min) : undefined,
      maxPrice: sp.max ? Number(sp.max) : undefined,
      inStockOnly: sp.stock === "1",
      sort: typeof sp.sort === "string" ? sp.sort : "relevance",
      page,
      pageSize: PAGE_SIZE,
    }),
    getBrands(category || undefined),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="container py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {q ? `"${q}"` : category ? t.nav.catalog : t.nav.catalog}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t.filters.results.replace("{count}", String(result.total))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MobileFilters brands={allBrands} facets={facets} />
          <SortSelect />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <CatalogFilters brands={allBrands} facets={facets} />
        </aside>

        <div>
          {result.products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24 text-center">
              <p className="text-lg font-medium">{t.common.noResults}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.wishlist.emptyHint}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {result.products.map((p) => (
                <ProductCard key={p.id} product={p} locale={locale} />
              ))}
            </div>
          )}

          <div className="mt-10">
            <Pagination page={page} totalPages={totalPages} />
          </div>
        </div>
      </div>
    </div>
  );
}
