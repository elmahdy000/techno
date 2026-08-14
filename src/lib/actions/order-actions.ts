"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { link } from "@/lib/links";
import { nextTicketNumber } from "@/lib/commerce";

const returnSchema = z.object({
  orderItemId: z.string().min(1),
  reason: z.string().min(3),
  description: z.string().min(10).max(2000).optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1).max(99),
});

export async function requestReturn(locale: string, input: z.infer<typeof returnSchema>) {
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));
  const parsed = returnSchema.parse(input);

  const orderItem = await prisma.orderItem.findFirst({
    where: {
      id: parsed.orderItemId,
      order: { userId: user.id },
    },
  });
  if (!orderItem) throw new Error("orderItemNotFound");
  if (orderItem.refundStatus !== "NONE") throw new Error("returnInProgress");
  if (orderItem.shippingStatus !== "DELIVERED") throw new Error("returnNotDelivered");
  if (parsed.quantity > orderItem.quantity) throw new Error("invalidQuantity");

  const req = await prisma.$transaction(async (tx) => {
    const created = await tx.returnRequest.create({
      data: {
        userId: user.id,
        orderItemId: parsed.orderItemId,
        reason: parsed.reason,
        description: parsed.description || null,
        quantity: parsed.quantity,
      },
    });

    await tx.orderItem.update({
      where: { id: orderItem.id },
      data: { refundStatus: "REQUESTED" },
    });

    await tx.notification.create({
      data: {
        vendorId: orderItem.vendorId,
        type: "ORDER",
        title: "Return request received",
        body: `A customer requested a return on ${orderItem.productName}`,
        link: "/vendor/orders",
      },
    });

    return created;
  });

  revalidatePath("/", "layout");
  return { ok: true, id: req.id };
}

const ticketSchema = z.object({
  subject: z.string().min(3).max(200),
  category: z.enum(["ORDER", "PAYMENT", "RETURN", "PRODUCT", "ACCOUNT", "VENDOR", "OTHER"]),
  message: z.string().min(10).max(3000),
  orderId: z.string().optional().or(z.literal("")),
});

export async function createTicket(locale: string, input: z.infer<typeof ticketSchema>) {
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));
  const parsed = ticketSchema.parse(input);

  // orderId must belong to the current user
  if (parsed.orderId) {
    const order = await prisma.order.findFirst({
      where: { id: parsed.orderId, userId: user.id },
      select: { id: true },
    });
    if (!order) throw new Error("orderNotFound");
  }

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.supportTicket.create({
      data: {
        ticketNumber: nextTicketNumber(),
        userId: user.id,
        subject: parsed.subject,
        category: parsed.category,
        orderId: parsed.orderId || null,
      },
    });
    await tx.supportMessage.create({
      data: {
        ticketId: created.id,
        senderId: user.id,
        senderRole: user.role,
        body: parsed.message,
      },
    });
    return created;
  });

  revalidatePath("/", "layout");
  return { ok: true, id: ticket.id };
}

const replySchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().trim().min(2).max(3000),
});

export async function replyToTicket(
  locale: string,
  ticketId: string,
  body: string,
) {
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));
  const parsed = replySchema.parse({ ticketId, body });

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: parsed.ticketId, userId: user.id },
  });
  if (!ticket) throw new Error("ticketNotFound");

  await prisma.supportMessage.create({
    data: { ticketId: ticket.id, senderId: user.id, senderRole: user.role, body: parsed.body },
  });
  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { status: "IN_PROGRESS" },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
