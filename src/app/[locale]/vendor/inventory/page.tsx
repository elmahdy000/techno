import { getDictionary, pageTitle } from "@/i18n/get-dictionary";
import { getCurrentVendor } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { link } from "@/lib/links";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdjustStockDialog } from "@/components/vendor/adjust-stock-dialog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return { title: pageTitle(locale, "vendorInventory") };
}

export default async function VendorInventoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const vendor = await getCurrentVendor();
  if (!vendor) return null;

  const variants = await prisma.variant.findMany({
    where: { product: { vendorId: vendor.id, status: { not: "ARCHIVED" } } },
    orderBy: [{ stock: "asc" }],
    include: {
      product: { select: { name: true, slug: true, images: { orderBy: { position: "asc" }, take: 1 } } },
    },
  });

  const lowStock = variants.filter((v) => v.active && v.stock <= v.lowStockThreshold).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.vendor.inventory}</h1>
          <p className="text-sm text-muted-foreground">
            {variants.length} {t.vendor.variants} · {lowStock} {t.vendor.lowStock}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.vendor.variants}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.name}</TableHead>
                <TableHead>{t.common.sku}</TableHead>
                <TableHead>{t.vendor.stock}</TableHead>
                <TableHead>{t.common.details}</TableHead>
                <TableHead className="text-end">{t.common.edit}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="min-w-0">
                    <a
                      href={link(locale, `/product/${v.product.slug}`)}
                      className="line-clamp-1 font-medium hover:underline"
                    >
                      {v.product.name}
                    </a>
                    <p className="text-xs text-muted-foreground">{v.name}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{v.sku}</TableCell>
                  <TableCell>
                    <Badge variant={v.stock === 0 ? "destructive" : v.stock <= v.lowStockThreshold ? "secondary" : "success"}>
                      {v.stock}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {v.product.images[0] ? "•" : ""}
                  </TableCell>
                  <TableCell className="text-end">
                    <AdjustStockDialog locale={locale} variantId={v.id} currentStock={v.stock} />
                  </TableCell>
                </TableRow>
              ))}
              {variants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    {t.vendor.noProducts}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
