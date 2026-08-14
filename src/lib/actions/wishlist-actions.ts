"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { link } from "@/lib/links";

export async function toggleWishlist(locale: string, productId: string) {
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
  } else {
    const product = await prisma.product.findFirst({
      where: { id: productId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!product) throw new Error("productNotFound");
    await prisma.wishlistItem.create({ data: { userId: user.id, productId } });
  }

  revalidatePath("/", "layout");
  return { ok: true, added: !existing };
}

export async function removeFromWishlist(locale: string, productId: string) {
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));
  await prisma.wishlistItem.deleteMany({
    where: { userId: user.id, productId },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addWishlistToCart(locale: string) {
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));

  const wishlist = await prisma.wishlistItem.findMany({
    where: { userId: user.id, product: { status: "ACTIVE" } },
    include: {
      product: { include: { variants: { where: { active: true }, orderBy: { price: "asc" } } } },
    },
  });

  const cart = await prisma.cart.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  for (const item of wishlist) {
    const variant = item.product.variants[0];
    if (!variant || variant.stock <= 0) continue;
    await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
      update: {},
      create: {
        cartId: cart.id,
        variantId: variant.id,
        productId: item.productId,
        quantity: 1,
      },
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
