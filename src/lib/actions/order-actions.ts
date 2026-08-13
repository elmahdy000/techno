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
  if (!orderItem) throw new Error("Order item not found");
  if (orderItem.refundStatus !== "NONE") throw new Error("A return is already in progress");
  if (parsed.quantity > orderItem.quantity) throw new Error("Invalid quantity");

  const req = await prisma.returnRequest.create({
    data: {
      userId: user.id,
      orderItemId: parsed.orderItemId,
      reason: parsed.reason,
      description: parsed.description || null,
      quantity: parsed.quantity,
    },
  });

  await prisma.orderItem.update({
    where: { id: orderItem.id },
    data: { refundStatus: "REQUESTED" },
  });

  await prisma.notification.create({
    data: {
      vendorId: orderItem.vendorId,
      type: "ORDER",
      title: "Return request received",
      body: `A customer requested a return on ${orderItem.productName}`,
      link: "/vendor/orders",
    },
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

  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNumber: nextTicketNumber(),
      userId: user.id,
      subject: parsed.subject,
      category: parsed.category,
      orderId: parsed.orderId || null,
    },
  });

  await prisma.supportMessage.create({
    data: {
      ticketId: ticket.id,
      senderId: user.id,
      senderRole: user.role,
      body: parsed.message,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true, id: ticket.id };
}

export async function replyToTicket(locale: string, ticketId: string, body: string) {
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId: user.id },
  });
  if (!ticket) throw new Error("Ticket not found");

  await prisma.supportMessage.create({
    data: { ticketId, senderId: user.id, senderRole: user.role, body },
  });
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: "IN_PROGRESS" },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
