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

type ProductWithRelations = {
  id: string;
  slug: string;
  name: string;
  nameAr: string | null;
  brand: string;
  rating: number;
  ratingCount: number;
  status: string;
  soldCount: number;
  createdAt: Date;
  images: Array<{ url: string; alt: string | null }>;
  variants: Array<{
    id: string;
    price: number;
    compareAtPrice: number | null;
    stock: number;
    active: boolean;
  }>;
};

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
  if (minPrice != null) variantPriceWhere.gte = toMinor(minPrice);
  if (maxPrice != null) variantPriceWhere.lte = toMinor(maxPrice);
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

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: PRODUCT_CARD_SELECT,
    }),
    prisma.product.count({ where }),
  ]);

  const enriched = rows.map((row) => ({
    ...row,
    minPrice: Math.min(...row.variants.filter((v) => v.active).map((v) => v.price), Number.MAX_SAFE_INTEGER),
  }));

  const sorter: Record<string, (a: ProductWithRelations & { minPrice: number }, b: ProductWithRelations & { minPrice: number }) => number> = {
    newest: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    price_asc: (a, b) => a.minPrice - b.minPrice,
    price_desc: (a, b) => b.minPrice - a.minPrice,
    rating: (a, b) => b.rating - a.rating,
    popular: (a, b) => b.soldCount - a.soldCount,
    relevance: () => 0,
  };

  const sortFn = sorter[sort] ?? sorter.relevance;
  if (sortFn !== sorter.relevance) {
    enriched.sort(sortFn);
  }

  const start = (page - 1) * pageSize;
  const products = enriched.slice(start, start + pageSize).map((p) => {
    const { minPrice: _min, ...rest } = p;
    return rest;
  });

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
  const attrs = await prisma.attribute.findMany({
    where: {
      filterable: true,
      OR: [{ categoryId: null }, { category: { slug: categorySlug } }],
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
