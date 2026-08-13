"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { link } from "@/lib/links";

const addSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(99),
});

async function requireUser(locale: string) {
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));
  return user;
}

export async function addToCart(locale: string, input: z.infer<typeof addSchema>) {
  const user = await requireUser(locale);
  const parsed = addSchema.parse(input);

  const variant = await prisma.variant.findUnique({
    where: { id: parsed.variantId },
    include: { product: { select: { id: true, status: true, vendorId: true } } },
  });
  if (!variant || !variant.active || variant.product.status !== "ACTIVE") {
    throw new Error("Product is not available");
  }
  if (variant.stock < parsed.quantity) {
    throw new Error("Not enough stock");
  }

  const cart = await prisma.cart.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
    update: { quantity: { increment: parsed.quantity } },
    create: {
      cartId: cart.id,
      variantId: variant.id,
      productId: variant.product.id,
      quantity: parsed.quantity,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateCartItem(
  locale: string,
  cartItemId: string,
  quantity: number,
) {
  const user = await requireUser(locale);
  const item = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { variant: true, cart: true },
  });
  if (!item || item.cart.userId !== user.id) {
    throw new Error("Cart item not found");
  }

  const nextQty = Math.max(1, Math.min(quantity, item.variant.stock, 99));
  await prisma.cartItem.update({
    where: { id: cartItemId },
    data: { quantity: nextQty },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeCartItem(locale: string, cartItemId: string) {
  const user = await requireUser(locale);
  const item = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { cart: true },
  });
  if (!item || item.cart.userId !== user.id) {
    throw new Error("Cart item not found");
  }
  await prisma.cartItem.delete({ where: { id: cartItemId } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function clearCart(locale: string) {
  const user = await requireUser(locale);
  await prisma.cartItem.deleteMany({ where: { cart: { userId: user.id } } });
  revalidatePath("/", "layout");
  return { ok: true };
}
