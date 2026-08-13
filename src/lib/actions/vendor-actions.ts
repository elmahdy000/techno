"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentVendor } from "@/lib/session";
import { link } from "@/lib/links";
import { slugify, generateUniqueSuffix } from "@/lib/utils";
import { toMinor } from "@/lib/money";

async function requireApprovedVendor(locale: string) {
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));
  if (user.role !== "VENDOR") {
    throw new Error("Vendor access required");
  }
  const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
  if (!vendor) throw new Error("Vendor account not found");
  if (vendor.status !== "APPROVED") {
    throw new Error("Vendor account is not approved yet");
  }
  return { user, vendor };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(2).max(64),
  name: z.string().min(1).max(120),
  price: z.coerce.number().positive(),
  compareAtPrice: z.coerce.number().positive().optional().nullable(),
  stock: z.coerce.number().int().min(0),
  options: z.record(z.string(), z.string()).optional(),
});

const productSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1),
  name: z.string().min(3).max(200),
  nameAr: z.string().max(200).optional().or(z.literal("")),
  brand: z.string().min(1).max(100),
  model: z.string().max(100).optional().or(z.literal("")),
  shortDescription: z.string().max(300).optional().or(z.literal("")),
  shortDescriptionAr: z.string().max(300).optional().or(z.literal("")),
  description: z.string().max(10000).optional().or(z.literal("")),
  warranty: z.string().max(100).optional().or(z.literal("")),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]),
  featured: z.boolean().optional(),
  images: z.array(z.string().url().or(z.string().min(1))).max(8).optional(),
  variants: z.array(variantSchema).min(1).max(20),
  specs: z.record(z.string(), z.string()).optional(),
});

export async function saveProduct(
  locale: string,
  input: z.infer<typeof productSchema>,
) {
  const { vendor } = await requireApprovedVendor(locale);
  const parsed = productSchema.parse(input);
  const isEdit = !!parsed.id;

  if (parsed.variants.length === 0) throw new Error("At least one variant is required");
  const skus = parsed.variants.map((v) => v.sku.trim().toUpperCase());
  if (new Set(skus).size !== skus.length) throw new Error("Duplicate SKUs in variants");

  // Check SKU uniqueness across vendors
  if (isEdit) {
    const existing = await prisma.variant.findFirst({
      where: { sku: { in: skus }, productId: { not: parsed.id } },
    });
    if (existing) throw new Error(`SKU ${existing.sku} already exists`);
  } else {
    const existing = await prisma.variant.findFirst({ where: { sku: { in: skus } } });
    if (existing) throw new Error(`SKU ${existing.sku} already exists`);
  }

  if (isEdit) {
    const product = await prisma.product.findFirst({
      where: { id: parsed.id, vendorId: vendor.id },
    });
    if (!product) throw new Error("Product not found");
  }

  const baseSlug = slugify(parsed.name);
  const slug = isEdit
    ? await uniqueSlug(baseSlug, parsed.id!)
    : await uniqueSlug(baseSlug);

  const totalStock = parsed.variants.reduce((a, v) => a + v.stock, 0);

  let productId: string | undefined = parsed.id;

  await prisma.$transaction(async (tx) => {
    if (isEdit) {
      await tx.product.update({
        where: { id: productId },
        data: {
          categoryId: parsed.categoryId,
          name: parsed.name,
          nameAr: parsed.nameAr || null,
          brand: parsed.brand,
          model: parsed.model || null,
          shortDescription: parsed.shortDescription || null,
          shortDescriptionAr: parsed.shortDescriptionAr || null,
          description: parsed.description || null,
          warranty: parsed.warranty || null,
          status: parsed.status,
          featured: parsed.featured ?? false,
          totalStock,
          searchTerms:
            `${parsed.name} ${parsed.nameAr} ${parsed.brand} ${parsed.model}`.toLowerCase(),
        },
      });
    } else {
      const created = await tx.product.create({
        data: {
          vendorId: vendor.id,
          categoryId: parsed.categoryId,
          name: parsed.name,
          nameAr: parsed.nameAr || null,
          slug,
          brand: parsed.brand,
          model: parsed.model || null,
          shortDescription: parsed.shortDescription || null,
          shortDescriptionAr: parsed.shortDescriptionAr || null,
          description: parsed.description || null,
          warranty: parsed.warranty || null,
          status: parsed.status,
          featured: parsed.featured ?? false,
          totalStock,
          searchTerms:
            `${parsed.name} ${parsed.nameAr} ${parsed.brand} ${parsed.model}`.toLowerCase(),
        },
      });
      productId = created.id;
    }

    // Images
    if (parsed.images && parsed.images.length > 0) {
      await tx.productImage.deleteMany({ where: { productId } });
      for (const [i, url] of parsed.images.entries()) {
        await tx.productImage.create({
          data: {
            productId: productId!,
            url,
            alt: parsed.name,
            position: i,
            isPrimary: i === 0,
          },
        });
      }
    }

    // Variants
    if (isEdit) {
      const oldIds = await tx.variant.findMany({ where: { productId } });
      const newIds = parsed.variants.filter((v) => v.id).map((v) => v.id!);
      for (const old of oldIds) {
        if (!newIds.includes(old.id)) {
          await tx.variant.delete({ where: { id: old.id } });
        }
      }
    }
    for (const v of parsed.variants) {
      const data = {
        sku: v.sku.trim().toUpperCase(),
        name: v.name,
        price: toMinor(v.price),
        compareAtPrice: v.compareAtPrice ? toMinor(v.compareAtPrice) : null,
        stock: v.stock,
        options: v.options && Object.keys(v.options).length ? v.options : undefined,
      };
      if (v.id && isEdit) {
        await tx.variant.update({ where: { id: v.id }, data });
      } else {
        await tx.variant.create({ data: { ...data, productId: productId! } });
      }
    }

    // Specs
    if (parsed.specs) {
      await tx.productAttributeValue.deleteMany({ where: { productId } });
      for (const [attrId, value] of Object.entries(parsed.specs)) {
        if (!value) continue;
        const attr = await tx.attribute.findUnique({ where: { id: attrId } });
        if (!attr) continue;
        await tx.productAttributeValue.create({
          data: { productId: productId!, attributeId: attrId, value },
        });
      }
    }
  });

  revalidatePath("/", "layout");
  return { ok: true, id: productId };
}

async function uniqueSlug(base: string, _excludeId?: string): Promise<string> {
  return `${base}-${generateUniqueSuffix()}`;
}

export async function deleteProduct(locale: string, productId: string) {
  const { vendor } = await requireApprovedVendor(locale);
  const product = await prisma.product.findFirst({
    where: { id: productId, vendorId: vendor.id },
  });
  if (!product) throw new Error("Product not found");
  const orderItemCount = await prisma.orderItem.count({ where: { productId } });
  if (orderItemCount > 0) {
    await prisma.product.update({ where: { id: productId }, data: { status: "ARCHIVED" } });
  } else {
    await prisma.product.delete({ where: { id: productId } });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

const inventorySchema = z.object({
  variantId: z.string().min(1),
  delta: z.coerce.number().int(),
  reason: z.string().min(2).max(200),
});

export async function adjustInventory(locale: string, input: z.infer<typeof inventorySchema>) {
  const { vendor } = await requireApprovedVendor(locale);
  const parsed = inventorySchema.parse(input);

  const variant = await prisma.variant.findFirst({
    where: { id: parsed.variantId, product: { vendorId: vendor.id } },
    include: { product: { select: { id: true, totalStock: true } } },
  });
  if (!variant) throw new Error("Variant not found");

  const newStock = Math.max(0, variant.stock + parsed.delta);
  const actualDelta = newStock - variant.stock;

  await prisma.$transaction(async (tx) => {
    await tx.variant.update({ where: { id: variant.id }, data: { stock: newStock } });
    await tx.product.update({
      where: { id: variant.productId },
      data: { totalStock: { increment: actualDelta } },
    });
    await tx.inventoryLog.create({
      data: {
        productId: variant.productId,
        variantId: variant.id,
        vendorId: vendor.id,
        change: actualDelta,
        stockAfter: newStock,
        reason: parsed.reason,
        type: actualDelta >= 0 ? "RESTOCK" : "ADJUSTMENT",
      },
    });
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Fulfillment
// ---------------------------------------------------------------------------

const shipSchema = z.object({
  shipmentId: z.string().min(1),
  trackingNumber: z.string().min(3).max(100),
  carrier: z.string().min(2).max(100),
});

export async function shipShipment(locale: string, input: z.infer<typeof shipSchema>) {
  const { vendor } = await requireApprovedVendor(locale);
  const parsed = shipSchema.parse(input);

  const shipment = await prisma.orderShipment.findFirst({
    where: { id: parsed.shipmentId, vendorId: vendor.id },
    include: { items: true },
  });
  if (!shipment) throw new Error("Shipment not found");

  await prisma.$transaction(async (tx) => {
    await tx.orderShipment.update({
      where: { id: shipment.id },
      data: {
        status: "SHIPPED",
        trackingNumber: parsed.trackingNumber,
        trackingCarrier: parsed.carrier,
        shippedAt: new Date(),
      },
    });
    for (const item of shipment.items) {
      await tx.orderItem.update({
        where: { id: item.id },
        data: {
          shippingStatus: "SHIPPED",
          trackingNumber: parsed.trackingNumber,
          trackingCarrier: parsed.carrier,
          shippedAt: new Date(),
        },
      });
    }
  });

  await prisma.orderStatusHistory.create({
    data: {
      orderId: shipment.orderId,
      to: "SHIPPED",
      note: `Shipped via ${parsed.carrier} (${parsed.trackingNumber})`,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deliverShipment(locale: string, shipmentId: string) {
  const { vendor } = await requireApprovedVendor(locale);
  const shipment = await prisma.orderShipment.findFirst({
    where: { id: shipmentId, vendorId: vendor.id },
    include: { items: true },
  });
  if (!shipment) throw new Error("Shipment not found");

  await prisma.$transaction(async (tx) => {
    await tx.orderShipment.update({
      where: { id: shipment.id },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });
    for (const item of shipment.items) {
      await tx.orderItem.update({
        where: { id: item.id },
        data: { shippingStatus: "DELIVERED", deliveredAt: new Date() },
      });
      // settle funds pending -> available
      if (item.vendorNet > 0) {
        const wallet = await tx.wallet.upsert({
          where: { vendorId: vendor.id },
          create: { vendorId: vendor.id },
          update: {},
        });
        const settled = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            pendingBalance: { decrement: item.vendorNet },
            availableBalance: { increment: item.vendorNet },
            lifetimeEarned: { increment: item.vendorNet },
          },
        });
        await tx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            vendorId: vendor.id,
            type: "ORDER_CREDIT",
            amount: item.vendorNet,
            balanceAfter: settled.availableBalance,
            orderItemId: item.id,
            reference: item.sku,
            description: "Funds settled on delivery",
          },
        });
      }
    }
  });

  // Check if all shipments delivered -> order delivered
  const order = await prisma.order.findUnique({
    where: { id: shipment.orderId },
    include: { shipments: true, items: true },
  });
  if (order) {
    const allDelivered = order.items.every((i) => i.shippingStatus === "DELIVERED");
    if (allDelivered && order.status !== "DELIVERED") {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });
      await prisma.orderStatusHistory.create({
        data: { orderId: order.id, to: "DELIVERED", note: "All shipments delivered" },
      });
      // notify customer
      await prisma.notification.create({
        data: {
          userId: order.userId,
          type: "ORDER",
          title: "Order delivered",
          body: `Order ${order.orderNumber} has been delivered. Enjoy!`,
          link: `/account/orders/${order.id}`,
        },
      });
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Withdrawals
// ---------------------------------------------------------------------------

const withdrawalSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.enum(["BANK_TRANSFER", "INSTAPAY", "OTHER"]),
  accountDetails: z.string().min(3).max(500),
  note: z.string().max(300).optional().or(z.literal("")),
});

export async function requestWithdrawal(locale: string, input: z.infer<typeof withdrawalSchema>) {
  const { vendor } = await requireApprovedVendor(locale);
  const parsed = withdrawalSchema.parse(input);
  const amountMinor = toMinor(parsed.amount);

  const wallet = await prisma.wallet.findUnique({ where: { vendorId: vendor.id } });
  if (!wallet || wallet.availableBalance < amountMinor) {
    throw new Error("Insufficient available balance");
  }

  const withdrawal = await prisma.withdrawal.create({
    data: {
      vendorId: vendor.id,
      walletId: wallet.id,
      amount: amountMinor,
      method: parsed.method,
      accountDetails: { info: parsed.accountDetails },
      requestNote: parsed.note || null,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true, id: withdrawal.id };
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

const reviewResponseSchema = z.object({
  reviewId: z.string().min(1),
  body: z.string().min(3).max(1000),
});

export async function respondToReview(locale: string, input: z.infer<typeof reviewResponseSchema>) {
  const { vendor } = await requireApprovedVendor(locale);
  const parsed = reviewResponseSchema.parse(input);

  const review = await prisma.review.findFirst({
    where: { id: parsed.reviewId, product: { vendorId: vendor.id } },
  });
  if (!review) throw new Error("Review not found");

  await prisma.reviewResponse.upsert({
    where: { reviewId: parsed.reviewId },
    update: { body: parsed.body },
    create: { reviewId: parsed.reviewId, vendorId: vendor.id, body: parsed.body },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Vendor profile
// ---------------------------------------------------------------------------

const vendorProfileSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  logo: z.string().optional().or(z.literal("")),
  cover: z.string().optional().or(z.literal("")),
});

export async function updateVendorProfile(locale: string, input: z.infer<typeof vendorProfileSchema>) {
  const { vendor } = await requireApprovedVendor(locale);
  const parsed = vendorProfileSchema.parse(input);

  await prisma.vendor.update({
    where: { id: vendor.id },
    data: {
      name: parsed.name,
      description: parsed.description || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      logo: parsed.logo || null,
      cover: parsed.cover || null,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markVendorNotificationsRead(
  locale: string,
  _formData?: FormData,
): Promise<void> {
  const { vendor } = await requireApprovedVendor(locale);
  await prisma.notification.updateMany({
    where: { vendorId: vendor.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
}
