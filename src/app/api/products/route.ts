import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  ids: z.string().min(1),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = schema.safeParse({ ids: url.searchParams.get("ids") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }
  const ids = parsed.data.ids.split(",").filter(Boolean);

  const products = await prisma.product.findMany({
    where: { id: { in: ids }, status: "ACTIVE" },
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      variants: { select: { id: true, price: true, compareAtPrice: true, stock: true, active: true } },
      attributes: { include: { attribute: true } },
      category: true,
    },
  });

  const data = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    nameAr: p.nameAr,
    brand: p.brand,
    rating: p.rating,
    ratingCount: p.ratingCount,
    price: Math.min(...p.variants.filter((v) => v.active).map((v) => v.price)),
    compareAtPrice: p.variants[0]?.compareAtPrice ?? null,
    stock: p.variants.reduce((a, v) => a + v.stock, 0),
    image: p.images[0]?.url ?? null,
    defaultVariantId: p.variants.find((v) => v.active)?.id ?? null,
    category: { name: p.category.name, nameAr: p.category.nameAr },
    specs: p.attributes.map((a) => ({
      name: a.attribute.name,
      nameAr: a.attribute.nameAr,
      value: a.value,
      unit: a.attribute.unit,
    })),
  }));

  return NextResponse.json({ products: data });
}
