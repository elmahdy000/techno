import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCurrentVendor } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { link } from "@/lib/links";
import { pickL } from "@/lib/links";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteProductButton } from "@/components/vendor/delete-product-button";

export const metadata = { title: "My products" };

const STATUS_LABEL_KEY: Record<string, string> = {
  DRAFT: "productStatusDraft",
  ACTIVE: "productStatusActive",
  INACTIVE: "productStatusInactive",
  ARCHIVED: "productStatusArchived",
};

const STATUS_VARIANT: Record<string, "secondary" | "success" | "default" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  ACTIVE: "success",
  INACTIVE: "outline",
  ARCHIVED: "destructive",
};

export default async function VendorProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const vendor = await getCurrentVendor();
  if (!vendor) return null;

  const products = await prisma.product.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { name: true, nameAr: true } },
      images: { orderBy: { position: "asc" }, take: 1 },
      variants: { select: { id: true, price: true, stock: true, compareAtPrice: true } },
      _count: { select: { orderItems: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.vendor.products}</h1>
          <p className="text-sm text-muted-foreground">{products.length} items</p>
        </div>
        <Button asChild>
          <Link href={link(locale, "/vendor/products/new")}>
            <Plus className="h-4 w-4" />
            {t.vendor.addProduct}
          </Link>
        </Button>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {t.vendor.noProducts}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {products.map((p) => {
                const minPrice = p.variants.reduce((m, v) => Math.min(m, v.price), Infinity);
                const maxPrice = p.variants.reduce((m, v) => Math.max(m, v.price), 0);
                const totalStock = p.variants.reduce((a, v) => a + v.stock, 0);
                const key = STATUS_LABEL_KEY[p.status] ?? "productStatusInactive";
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-4 p-4">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                      {p.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.images[0].url}
                          alt={p.images[0].alt ?? p.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={link(locale, `/vendor/products/${p.id}`)}
                        className="line-clamp-1 font-medium hover:underline"
                      >
                        {pickL(locale, p.name, p.nameAr)}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {pickL(locale, p.category.name, p.category.nameAr)} · {p.brand} ·{" "}
                        {p._count.orderItems} sold
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant={STATUS_VARIANT[p.status]}>
                          {t.vendor[key as keyof typeof t.vendor] as unknown as string}
                        </Badge>
                        <Badge variant="secondary">
                          {totalStock} {t.vendor.stock}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="text-sm font-semibold">
                        {minPrice === maxPrice
                          ? formatMoney(minPrice)
                          : `${formatMoney(minPrice)} – ${formatMoney(maxPrice)}`}
                      </p>
                      <div className="mt-2 flex items-center justify-end gap-1">
                        <Button asChild variant="outline" size="sm">
                          <Link href={link(locale, `/vendor/products/${p.id}`)}>
                            <Pencil className="h-3.5 w-3.5" />
                            {t.common.edit}
                          </Link>
                        </Button>
                        <DeleteProductButton productId={p.id} label={t.common.delete} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
