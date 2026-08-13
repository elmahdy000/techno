import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/i18n/get-dictionary";
import { link } from "@/lib/links";
import { computeOrderTotals } from "@/lib/commerce";
import { formatMoney } from "@/lib/money";
import { CartItemRow } from "@/components/cart/cart-item-row";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));

  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        include: {
          variant: true,
          product: {
            select: {
              slug: true,
              name: true,
              nameAr: true,
              images: { orderBy: { position: "asc" }, take: 1 },
            },
          },
        },
        orderBy: { addedAt: "asc" },
      },
    },
  });

  const items = cart?.items ?? [];
  const totals = computeOrderTotals(
    items.map((i) => ({ unitPriceMinor: i.variant.price, quantity: i.quantity })),
  );

  const lines = items.map((i) => ({
    id: i.id,
    quantity: i.quantity,
    productSlug: i.product.slug,
    productName: i.product.name,
    productNameAr: i.product.nameAr,
    variantName: i.variant.name,
    sku: i.variant.sku,
    imageUrl: i.product.images[0]?.url ?? null,
    price: i.variant.price,
    stock: i.variant.stock,
  }));

  if (items.length === 0) {
    return (
      <div className="container flex flex-col items-center justify-center py-24 text-center">
        <ShoppingCart className="h-16 w-16 text-muted-foreground/40" />
        <h1 className="mt-4 text-2xl font-bold">{t.cart.empty}</h1>
        <p className="mt-2 text-muted-foreground">{t.cart.emptyHint}</p>
        <Button asChild className="mt-6">
          <Link href={link(locale, "/catalog")}>{t.cart.startShopping}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-bold">
        {t.cart.title}{" "}
        <span className="text-base font-normal text-muted-foreground">
          ({t.cart.itemsCount.replace("{count}", String(items.reduce((a, i) => a + i.quantity, 0)))})
        </span>
      </h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {lines.map((l) => (
            <CartItemRow key={l.id} item={l} locale={locale} />
          ))}
          <div className="flex justify-end">
            <Button asChild variant="ghost" size="sm">
              <Link href={link(locale, "/catalog")}>{t.cart.continueShopping}</Link>
            </Button>
          </div>
        </div>

        <aside className="h-fit rounded-lg border p-5 lg:sticky lg:top-20">
          <h2 className="font-bold">{t.cart.orderSummary}</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.common.subtotal}</span>
              <span>{formatMoney(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.common.shipping}</span>
              <span>{totals.shippingFee === 0 ? t.common.free : formatMoney(totals.shippingFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.common.tax}</span>
              <span>{formatMoney(totals.taxAmount)}</span>
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between text-base font-bold">
              <span>{t.common.total}</span>
              <span>{formatMoney(totals.total)}</span>
            </div>
          </div>
          <Button asChild size="lg" className="mt-5 w-full">
            <Link href={link(locale, "/checkout")}>{t.cart.checkout}</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
