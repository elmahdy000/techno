"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { link } from "@/lib/links";

const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(120).optional().or(z.literal("")),
  body: z.string().min(10).max(2000),
  orderItemId: z.string().optional().or(z.literal("")),
});

export async function submitReview(
  locale: string,
  input: z.infer<typeof reviewSchema>,
) {
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));
  if (user.role !== "CUSTOMER") {
    throw new Error("Only customers can write reviews");
  }

  const parsed = reviewSchema.parse(input);
  const product = await prisma.product.findFirst({
    where: { id: parsed.productId, status: "ACTIVE" },
  });
  if (!product) throw new Error("Product not found");

  const existing = await prisma.review.findUnique({
    where: { userId_productId: { userId: user.id, productId: parsed.productId } },
  });
  if (existing) throw new Error("You already reviewed this product");

  let verified = false;
  if (parsed.orderItemId) {
    const orderItem = await prisma.orderItem.findFirst({
      where: {
        id: parsed.orderItemId,
        productId: parsed.productId,
        vendorId: product.vendorId,
        order: {
          userId: user.id,
          status: { in: ["DELIVERED"] },
        },
      },
    });
    if (orderItem) verified = true;
  }

  const review = await prisma.review.create({
    data: {
      userId: user.id,
      productId: parsed.productId,
      orderItemId: parsed.orderItemId || null,
      rating: parsed.rating,
      title: parsed.title || null,
      body: parsed.body,
      status: "PUBLISHED",
      isVerifiedPurchase: verified,
    },
  });

  await recomputeRating(parsed.productId);

  await prisma.notification.create({
    data: {
      vendorId: product.vendorId,
      type: "REVIEW",
      title: "New product review",
      body: `${user.name} left a ${parsed.rating}-star review on ${product.name}`,
      link: "/vendor/reviews",
    },
  });

  revalidatePath("/", "layout");
  return { ok: true, reviewId: review.id };
}

const voteSchema = z.object({
  reviewId: z.string().min(1),
  helpful: z.boolean(),
});

export async function voteHelpful(locale: string, input: z.infer<typeof voteSchema>) {
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));
  const parsed = voteSchema.parse(input);

  const existing = await prisma.reviewHelpful.findUnique({
    where: {
      userId_reviewId: { userId: user.id, reviewId: parsed.reviewId },
    },
  });

  if (existing) {
    if (existing.helpful === parsed.helpful) {
      await prisma.reviewHelpful.delete({ where: { id: existing.id } });
      await prisma.review.update({
        where: { id: parsed.reviewId },
        data: { helpfulCount: { increment: parsed.helpful ? -1 : 1 } },
      });
    } else {
      await prisma.reviewHelpful.update({
        where: { id: existing.id },
        data: { helpful: parsed.helpful },
      });
      await prisma.review.update({
        where: { id: parsed.reviewId },
        data: { helpfulCount: { increment: parsed.helpful ? 1 : -1 } },
      });
    }
  } else {
    await prisma.reviewHelpful.create({
      data: {
        userId: user.id,
        reviewId: parsed.reviewId,
        helpful: parsed.helpful,
      },
    });
    await prisma.review.update({
      where: { id: parsed.reviewId },
      data: { helpfulCount: { increment: parsed.helpful ? 1 : 0 } },
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

async function recomputeRating(productId: string) {
  const agg = await prisma.review.aggregate({
    where: { productId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: agg._avg.rating ?? 0,
      ratingCount: agg._count._all,
    },
  });
}
