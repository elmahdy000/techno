import { getDictionary } from "@/i18n/get-dictionary";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/vendor/product-form";

export const metadata = { title: "Add product" };

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);

  const [categories, attributes] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
      include: { parent: { select: { name: true, nameAr: true } } },
    }),
    prisma.attribute.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.vendor.addProduct}</h1>
        <p className="text-sm text-muted-foreground">{t.vendor.productCreated}</p>
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
      />
    </div>
  );
}
