"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { link } from "@/lib/links";
import {
  computeItemCommission,
  computeOrderTotals,
  nextOrderNumber,
  getDefaultCommissionRate,
  getVendorCommissionRate,
} from "@/lib/commerce";

const placeOrderSchema = z.object({
  addressId: z.string().min(1, "Please select a shipping address"),
  paymentMethod: z.enum(["CARD", "COD"]),
  note: z.string().max(500).optional().or(z.literal("")),
});

export async function placeOrder(
  locale: string,
  input: z.infer<typeof placeOrderSchema>,
) {
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));
  const parsed = placeOrderSchema.parse(input);

  const address = await prisma.address.findFirst({
    where: { id: parsed.addressId, userId: user.id },
  });
  if (!address) throw new Error("Shipping address not found");

  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        include: {
          variant: { include: { product: { select: { vendorId: true, status: true, name: true } } } },
          product: { select: { slug: true, name: true, nameAr: true, images: { orderBy: { position: "asc" }, take: 1 } } },
        },
      },
    },
  });

  const items = (cart?.items ?? []).filter((i) => i.variant.active && i.variant.product.status === "ACTIVE");
  if (items.length === 0) throw new Error("Your cart is empty");

  const defaultRate = await getDefaultCommissionRate();
  const vendorIds = Array.from(new Set(items.map((i) => i.variant.product.vendorId)));
  const vendors = await prisma.vendor.findMany({ where: { id: { in: vendorIds } } });
  const vendorRate = new Map(vendors.map((v) => [v.id, getVendorCommissionRate(v, defaultRate)]));

  const totals = computeOrderTotals(
    items.map((i) => ({ unitPriceMinor: i.variant.price, quantity: i.quantity })),
  );

  const orderNumber = nextOrderNumber();

  const order = await prisma.$transaction(async (tx) => {
    // Stock check & reserve (atomic decrement)
    for (const item of items) {
      const updated = await tx.variant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity }, active: true },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count === 0) {
        throw new Error(`"${item.product.name}" is no longer available in the requested quantity`);
      }
    }

    const created = await tx.order.create({
      data: {
        orderNumber,
        userId: user.id,
        status: parsed.paymentMethod === "COD" ? "PENDING" : "CONFIRMED",
        paymentStatus: parsed.paymentMethod === "COD" ? "UNPAID" : "PAID",
        paymentMethod: parsed.paymentMethod,
        paymentReference:
          parsed.paymentMethod === "CARD"
            ? `SIM-${Math.random().toString(36).slice(2, 12).toUpperCase()}`
            : null,
        address: {
          fullName: address.fullName,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2 ?? "",
          city: address.city,
          state: address.state ?? "",
          country: address.country,
          postalCode: address.postalCode ?? "",
        },
        subtotal: totals.subtotal,
        discount: totals.discount,
        shippingFee: totals.shippingFee,
        taxAmount: totals.taxAmount,
        total: totals.total,
        note: parsed.note || null,
      },
    });

    // Group by vendor for shipments
    const byVendor = new Map<string, typeof items>();
    for (const item of items) {
      const vid = item.variant.product.vendorId;
      if (!byVendor.has(vid)) byVendor.set(vid, []);
      byVendor.get(vid)!.push(item);
    }

    // Create shipments and order items with commission snapshots
    for (const [vendorId, vendorItems] of byVendor) {
      const rate = vendorRate.get(vendorId) ?? defaultRate;
      const shipment = await tx.orderShipment.create({
        data: { orderId: created.id, vendorId },
      });
      for (const item of vendorItems) {
        const commission = computeItemCommission(item.variant.price, item.quantity, rate);
        await tx.orderItem.create({
          data: {
            orderId: created.id,
            vendorId,
            productId: item.productId,
            variantId: item.variantId,
            shipmentId: shipment.id,
            productName: item.product.name,
            variantName: item.variant.name,
            sku: item.variant.sku,
            imageUrl: item.product.images[0]?.url ?? null,
            quantity: item.quantity,
            unitPrice: item.variant.price,
            lineTotal: item.variant.price * item.quantity,
            commissionRate: commission.rate,
            commissionAmount: commission.commissionAmount,
            vendorNet: commission.vendorNet,
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { soldCount: { increment: item.quantity }, totalStock: { decrement: item.quantity } },
        });

        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            vendorId,
            change: -item.quantity,
            stockAfter: item.variant.stock - item.quantity,
            reason: `Order ${orderNumber}`,
            type: "SALE",
            reference: created.id,
          },
        });

        // Credit pending wallet balance for paid orders
        if (created.paymentStatus === "PAID") {
          const wallet = await tx.wallet.upsert({
            where: { vendorId },
            create: { vendorId },
            update: {},
          });
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { pendingBalance: { increment: commission.vendorNet } },
          });
          const orderItem = await tx.orderItem.findFirstOrThrow({
            where: { orderId: created.id, variantId: item.variantId, vendorId },
          });
          await tx.ledgerEntry.create({
            data: {
              walletId: wallet.id,
              vendorId,
              type: "ORDER_CREDIT",
              amount: commission.vendorNet,
              balanceAfter: wallet.pendingBalance + commission.vendorNet,
              orderItemId: orderItem.id,
              reference: orderNumber,
              description: "Order credit (pending settlement)",
            },
          });
        }
      }
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: created.id,
        to: created.status,
        note: parsed.paymentMethod === "COD" ? "Order placed, cash on delivery" : "Order placed and paid",
        changedById: user.id,
      },
    });

    await tx.cartItem.deleteMany({ where: { cartId: cart!.id } });

    return created;
  });

  // Notifications for vendors (outside transaction)
  for (const vendorId of vendorIds) {
    await prisma.notification.create({
      data: {
        vendorId,
        type: "ORDER",
        title: "New order received",
        body: `You have items in order ${orderNumber}`,
        link: "/vendor/orders",
      },
    });
  }

  revalidatePath("/", "layout");
  redirect(link(locale, `/account/orders/${order.id}`));
}

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
