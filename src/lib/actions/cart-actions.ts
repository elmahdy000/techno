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
    throw new Error("productUnavailable");
  }
  if (variant.stock < parsed.quantity) {
    throw new Error("notEnoughStock");
  }

  await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    const existing = await tx.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
      select: { quantity: true },
    });
    const newQty = (existing?.quantity ?? 0) + parsed.quantity;
    if (newQty > variant.stock) throw new Error("notEnoughStock");

    if (existing) {
      // Conditional update re-checks stock atomically so concurrent adds
      // can't oversell the available inventory.
      const updated = await tx.cartItem.updateMany({
        where: {
          cartId: cart.id,
          variantId: variant.id,
          variant: { stock: { gte: newQty } },
        },
        data: { quantity: newQty },
      });
      if (updated.count === 0) throw new Error("notEnoughStock");
    } else {
      try {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            variantId: variant.id,
            productId: variant.product.id,
            quantity: parsed.quantity,
          },
        });
      } catch {
        // A concurrent add created the row between read and create; fall
        // through to the conditional-increment path.
        const updated = await tx.cartItem.updateMany({
          where: {
            cartId: cart.id,
            variantId: variant.id,
            variant: { stock: { gte: newQty } },
          },
          data: { quantity: newQty },
        });
        if (updated.count === 0) throw new Error("notEnoughStock");
      }
    }
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

const updateSchema = z.object({
  cartItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(99),
});

export async function updateCartItem(
  locale: string,
  cartItemId: string,
  quantity: number,
) {
  const user = await requireUser(locale);
  const parsed = updateSchema.parse({ cartItemId, quantity });
  const item = await prisma.cartItem.findUnique({
    where: { id: parsed.cartItemId },
    include: { variant: true, cart: true },
  });
  if (!item || item.cart.userId !== user.id) {
    throw new Error("cartItemNotFound");
  }

  const nextQty = Math.max(1, Math.min(parsed.quantity, item.variant.stock, 99));
  await prisma.cartItem.update({
    where: { id: parsed.cartItemId },
    data: { quantity: nextQty },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeCartItem(locale: string, cartItemId: string) {
  const user = await requireUser(locale);
  const parsed = updateSchema.pick({ cartItemId: true }).parse({ cartItemId });
  const item = await prisma.cartItem.findUnique({
    where: { id: parsed.cartItemId },
    include: { cart: true },
  });
  if (!item || item.cart.userId !== user.id) {
    throw new Error("cartItemNotFound");
  }
  await prisma.cartItem.delete({ where: { id: parsed.cartItemId } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function clearCart(locale: string) {
  const user = await requireUser(locale);
  await prisma.cartItem.deleteMany({ where: { cart: { userId: user.id } } });
  revalidatePath("/", "layout");
  return { ok: true };
}
