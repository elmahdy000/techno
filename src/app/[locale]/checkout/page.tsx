import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/i18n/get-dictionary";
import { link } from "@/lib/links";
import { computeOrderTotals } from "@/lib/commerce";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));

  const [cart, addresses] = await Promise.all([
    prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            variant: { include: { product: { select: { slug: true, name: true, status: true, images: { orderBy: { position: "asc" }, take: 1 } } } } },
          },
        },
      },
    }),
    prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
  ]);

  const items = (cart?.items ?? []).filter((i) => i.variant.active && i.variant.product.status === "ACTIVE");
  if (items.length === 0) {
    redirect(link(locale, "/cart"));
  }

  const totals = computeOrderTotals(
    items.map((i) => ({ unitPriceMinor: i.variant.price, quantity: i.quantity })),
  );

  const lines = items.map((i) => ({
    productSlug: i.variant.product.slug,
    productName: i.variant.product.name,
    variantName: i.variant.name,
    quantity: i.quantity,
    imageUrl: i.variant.product.images[0]?.url ?? null,
    price: i.variant.price,
  }));

  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-bold">{t.checkout.title}</h1>
      <CheckoutForm
        locale={locale}
        addresses={addresses.map((a) => ({
          id: a.id,
          fullName: a.fullName,
          phone: a.phone,
          line1: a.line1,
          line2: a.line2,
          city: a.city,
          state: a.state,
          country: a.country,
          postalCode: a.postalCode,
          isDefault: a.isDefault,
        }))}
        lines={lines}
        totals={{
          subtotal: totals.subtotal,
          shippingFee: totals.shippingFee,
          taxAmount: totals.taxAmount,
          total: totals.total,
        }}
      />
    </div>
  );
}
