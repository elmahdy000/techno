import { prisma } from "@/lib/prisma";
import { toMinor } from "@/lib/money";
import type { ProductCardData } from "@/components/product/product-card";

export type ProductQuery = {
  q?: string;
  categorySlug?: string;
  brands?: string[];
  attrFilters?: Record<string, string>;
  minPrice?: number; // EGP float
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
};

const PRODUCT_CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  nameAr: true,
  brand: true,
  rating: true,
  ratingCount: true,
  status: true,
  soldCount: true,
  createdAt: true,
  images: {
    orderBy: { position: "asc" as const },
    take: 1,
    select: { url: true, alt: true },
  },
  variants: {
    select: {
      id: true,
      price: true,
      compareAtPrice: true,
      stock: true,
      active: true,
    },
  },
} as const;

export async function queryProducts(
  opts: ProductQuery,
): Promise<{ products: ProductCardData[]; total: number }> {
  const { q, categorySlug, brands, attrFilters, minPrice, maxPrice, inStockOnly, sort = "relevance", page = 1, pageSize = 24 } = opts;

  const where: Record<string, unknown> = { status: "ACTIVE" };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { searchTerms: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
    ];
  }

  if (categorySlug) {
    where.category = {
      OR: [{ slug: categorySlug }, { parent: { slug: categorySlug } }],
    };
  }

  if (brands && brands.length > 0) {
    where.brand = { in: brands };
  }

  const variantPriceWhere: Record<string, unknown> = {};
  // Guard against NaN / non-numeric inputs that would make Prisma throw
  const safeMin = typeof minPrice === "number" && Number.isFinite(minPrice) ? minPrice : undefined;
  const safeMax = typeof maxPrice === "number" && Number.isFinite(maxPrice) ? maxPrice : undefined;
  if (safeMin != null) variantPriceWhere.gte = toMinor(safeMin);
  if (safeMax != null) variantPriceWhere.lte = toMinor(safeMax);
  if (inStockOnly) variantPriceWhere.stock = { gt: 0 };
  if (Object.keys(variantPriceWhere).length > 0) {
    where.variants = { some: { ...variantPriceWhere, active: true } };
  }

  if (attrFilters && Object.keys(attrFilters).length > 0) {
    const attrConditions = Object.entries(attrFilters).map(([slug, value]) => ({
      attributes: {
        some: { attribute: { slug }, value: { equals: value } },
      },
    }));
    where.AND = [...(Array.isArray(where.AND) ? where.AND : []), ...attrConditions];
  }

  const sortIsPrice = sort === "price_asc" || sort === "price_desc";

  // Lightweight pass: only the fields needed to sort/paginate, so the full
  // product rows are never pulled into memory for the whole result set.
  const light = await prisma.product.findMany({
    where,
    select: {
      id: true,
      createdAt: true,
      rating: true,
      soldCount: true,
      variants: { select: { price: true, active: true } },
    },
  });

  type SortRow = {
    id: string;
    createdAt: Date;
    rating: number;
    soldCount: number;
    minPrice: number;
    hasActiveVariant: boolean;
  };

  const rows: SortRow[] = light.map((row) => {
    const activePrices = row.variants.filter((v) => v.active).map((v) => v.price);
    const hasActiveVariant = activePrices.length > 0;
    return {
      id: row.id,
      createdAt: row.createdAt,
      rating: row.rating,
      soldCount: row.soldCount,
      minPrice: hasActiveVariant ? Math.min(...activePrices) : 0,
      hasActiveVariant,
    };
  });

  const sorter: Record<string, (a: SortRow, b: SortRow) => number> = {
    newest: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    price_asc: (a, b) => a.minPrice - b.minPrice,
    price_desc: (a, b) => b.minPrice - a.minPrice,
    rating: (a, b) => b.rating - a.rating,
    popular: (a, b) => b.soldCount - a.soldCount,
    relevance: () => 0,
  };

  const sortFn = sorter[sort] ?? sorter.relevance;
  let sorted = rows;
  if (sortFn !== sorter.relevance) sorted = [...rows].sort(sortFn);

  // Products with no active variant have no sellable price; exclude them from
  // price sorts so they never surface as the "cheapest" option.
  if (sortIsPrice) sorted = sorted.filter((r) => r.hasActiveVariant);

  const start = (page - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  const total = sortIsPrice
    ? sorted.length
    : await prisma.product.count({ where });

  const ids = pageRows.map((r) => r.id);
  if (ids.length === 0) return { products: [], total };

  const full = await prisma.product.findMany({
    where: { id: { in: ids }, status: "ACTIVE" },
    select: PRODUCT_CARD_SELECT,
  });

  const byId = new Map(full.map((p) => [p.id, p]));
  const products = ids.map((id) => byId.get(id)!).filter(Boolean);

  return { products, total };
}

export async function getBrands(categorySlug?: string): Promise<string[]> {
  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (categorySlug) {
    where.category = { OR: [{ slug: categorySlug }, { parent: { slug: categorySlug } }] };
  }
  const rows = await prisma.product.findMany({
    where,
    select: { brand: true },
    distinct: ["brand"],
    orderBy: { brand: "asc" },
  });
  return rows.map((r) => r.brand);
}

export type FacetAttribute = {
  id: string;
  slug: string;
  name: string;
  nameAr: string | null;
  options: string[];
  unit: string | null;
};

export async function getFacetAttributes(categorySlug?: string): Promise<FacetAttribute[]> {
  // Global attributes (categoryId null) always apply. Category-specific ones
  // only apply when a category is selected; otherwise they'd all show as
  // global facets and duplicate each other.
  const attrs = await prisma.attribute.findMany({
    where: {
      filterable: true,
      ...(categorySlug
        ? { OR: [{ categoryId: null }, { category: { slug: categorySlug } }] }
        : { categoryId: null }),
    },
    orderBy: { sortOrder: "asc" },
  });

  const facets: FacetAttribute[] = [];
  for (const a of attrs) {
    const options = (Array.isArray(a.options) ? a.options : []).filter(
      (o): o is string => typeof o === "string",
    );
    facets.push({
      id: a.id,
      slug: a.slug,
      name: a.name,
      nameAr: a.nameAr,
      options,
      unit: a.unit,
    });
  }
  return facets;
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: {
      parent: true,
      children: { where: { active: true }, orderBy: { sortOrder: "asc" } },
    },
  });
}
