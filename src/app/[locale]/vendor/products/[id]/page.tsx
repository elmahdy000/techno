import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCurrentVendor } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { fromMinor } from "@/lib/money";
import { ProductForm } from "@/components/vendor/product-form";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = getDictionary(locale);
  const vendor = await getCurrentVendor();
  if (!vendor) notFound();

  const product = await prisma.product.findFirst({
    where: { id, vendorId: vendor.id },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { createdAt: "asc" } },
      attributes: { select: { attributeId: true, value: true } },
    },
  });
  if (!product) notFound();

  const [categories, attributes] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
      include: { parent: { select: { name: true, nameAr: true } } },
    }),
    prisma.attribute.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const specs: Record<string, string> = {};
  for (const a of product.attributes) {
    specs[a.attributeId] = a.value;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.vendor.editProduct}</h1>
        <p className="text-sm text-muted-foreground">{product.name}</p>
      </div>
      <ProductForm
        locale={locale}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          nameAr: c.nameAr,
          parent: c.parent ? { name: c.parent.name, nameAr: c.parent.nameAr } : null,
        }))}
        attributes={attributes.map((a) => ({
          id: a.id,
          name: a.name,
          nameAr: a.nameAr,
          type: a.type,
          unit: a.unit,
          options: a.options,
        }))}
        initial={{
          id: product.id,
          name: product.name,
          nameAr: product.nameAr ?? "",
          brand: product.brand,
          model: product.model ?? "",
          categoryId: product.categoryId,
          shortDescription: product.shortDescription ?? "",
          shortDescriptionAr: product.shortDescriptionAr ?? "",
          description: product.description ?? "",
          warranty: product.warranty ?? "",
          status: product.status,
          featured: product.featured,
          images: product.images.map((i) => i.url),
          variants: product.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            name: v.name,
            price: String(fromMinor(v.price)),
            compareAtPrice: v.compareAtPrice != null ? String(fromMinor(v.compareAtPrice)) : "",
            stock: String(v.stock),
          })),
          specs,
        }}
      />
    </div>
  );
}
