"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { checkPermission } from "@/lib/rbac";
import { link } from "@/lib/links";
import { debitWalletForWithdrawal } from "@/lib/wallet";

async function requireAdmin(locale: string) {
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));
  return user;
}

async function requireAdminPermission(locale: string, code: "vendors.manage" | "users.manage" | "withdrawals.manage" | "commission.manage" | "support.manage" | "review.moderate" | "order.admin_manage") {
  const user = await requireAdmin(locale);
  const ok = await checkPermission(user, code);
  if (!ok) throw new Error("Admin access required");
  return user;
}

// ---------------------------------------------------------------------------
// Vendors
// ---------------------------------------------------------------------------

const vendorDecisionSchema = z.object({
  vendorId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT", "SUSPEND", "REACTIVATE"]),
  note: z.string().max(500).optional().or(z.literal("")),
});

export async function decideVendor(locale: string, input: z.infer<typeof vendorDecisionSchema>) {
  await requireAdminPermission(locale, "vendors.manage");
  const parsed = vendorDecisionSchema.parse(input);

  const vendor = await prisma.vendor.findUnique({ where: { id: parsed.vendorId } });
  if (!vendor) throw new Error("Vendor not found");

  const statusMap: Record<string, "APPROVED" | "REJECTED" | "SUSPENDED" | "APPROVED"> = {
    APPROVE: "APPROVED",
    REJECT: "REJECTED",
    SUSPEND: "SUSPENDED",
    REACTIVATE: "APPROVED",
  };
  const status = statusMap[parsed.action];

  await prisma.vendor.update({
    where: { id: vendor.id },
    data: {
      status,
      approvedAt: status === "APPROVED" ? vendor.approvedAt ?? new Date() : vendor.approvedAt,
    },
  });

  if (status === "APPROVED") {
    await prisma.notification.create({
      data: {
        userId: vendor.userId,
        type: "SYSTEM",
        title: "Vendor approved",
        body: "Your vendor account has been approved. You can now list products.",
        link: "/vendor",
      },
    });
  } else if (status === "REJECTED" || status === "SUSPENDED") {
    await prisma.notification.create({
      data: {
        userId: vendor.userId,
        type: "SYSTEM",
        title: status === "REJECTED" ? "Vendor application rejected" : "Vendor account suspended",
        body: parsed.note || undefined,
      },
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

const userActionSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["ACTIVATE", "DEACTIVATE"]),
});

export async function manageUser(locale: string, input: z.infer<typeof userActionSchema>) {
  await requireAdminPermission(locale, "users.manage");
  const parsed = userActionSchema.parse(input);

  await prisma.user.update({
    where: { id: parsed.userId },
    data: { active: parsed.action === "ACTIVATE" },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Commission
// ---------------------------------------------------------------------------

const commissionSchema = z.object({
  rate: z.coerce.number().min(0).max(1),
});

export async function setCommissionRate(locale: string, input: z.infer<typeof commissionSchema>) {
  await requireAdminPermission(locale, "commission.manage");
  const parsed = commissionSchema.parse(input);

  await prisma.commissionConfig.upsert({
    where: { key: "default_commission_rate" },
    update: { value: parsed.rate },
    create: { key: "default_commission_rate", value: parsed.rate, description: "Default platform commission rate (0..1)" },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

const vendorRateSchema = z.object({
  vendorId: z.string().min(1),
  rate: z.coerce.number().min(0).max(1).nullable(),
});

export async function setVendorCommissionRate(locale: string, input: z.infer<typeof vendorRateSchema>) {
  await requireAdminPermission(locale, "commission.manage");
  const parsed = vendorRateSchema.parse(input);

  await prisma.vendor.update({
    where: { id: parsed.vendorId },
    data: { commissionRate: parsed.rate },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Withdrawals
// ---------------------------------------------------------------------------

const withdrawalDecisionSchema = z.object({
  withdrawalId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT"]),
  note: z.string().max(500).optional().or(z.literal("")),
});

export async function decideWithdrawal(locale: string, input: z.infer<typeof withdrawalDecisionSchema>) {
  await requireAdminPermission(locale, "withdrawals.manage");
  const parsed = withdrawalDecisionSchema.parse(input);

  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: parsed.withdrawalId },
    include: { vendor: true },
  });
  if (!withdrawal) throw new Error("Withdrawal not found");
  if (withdrawal.status !== "PENDING") throw new Error("Withdrawal already processed");

  if (parsed.action === "APPROVE") {
    const res = await debitWalletForWithdrawal(
      withdrawal.vendorId,
      withdrawal.amount,
      withdrawal.id,
    );
    if (!res.ok) throw new Error(res.error ?? "Insufficient balance");
    await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: { status: "PROCESSING", adminNote: parsed.note || null, processedAt: new Date() },
    });
  } else {
    await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: { status: "REJECTED", adminNote: parsed.note || null, processedAt: new Date() },
    });
  }

  await prisma.notification.create({
    data: {
      vendorId: withdrawal.vendorId,
      type: "WALLET",
      title: parsed.action === "APPROVE" ? "Withdrawal approved" : "Withdrawal rejected",
      body: parsed.note || undefined,
      link: "/vendor/wallet",
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Support
// ---------------------------------------------------------------------------

const ticketReplySchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().min(2).max(3000),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"]),
});

export async function replyTicket(locale: string, input: z.infer<typeof ticketReplySchema>) {
  const user = await requireAdminPermission(locale, "support.manage");
  const parsed = ticketReplySchema.parse(input);

  const ticket = await prisma.supportTicket.findUnique({ where: { id: parsed.ticketId } });
  if (!ticket) throw new Error("Ticket not found");

  await prisma.supportMessage.create({
    data: {
      ticketId: ticket.id,
      senderId: user.id,
      senderRole: user.role,
      body: parsed.body,
    },
  });
  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { status: parsed.status },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reviews moderation
// ---------------------------------------------------------------------------

const reviewDecisionSchema = z.object({
  reviewId: z.string().min(1),
  action: z.enum(["PUBLISH", "REJECT"]),
});

export async function moderateReview(locale: string, input: z.infer<typeof reviewDecisionSchema>) {
  await requireAdminPermission(locale, "review.moderate");
  const parsed = reviewDecisionSchema.parse(input);

  await prisma.review.update({
    where: { id: parsed.reviewId },
    data: { status: parsed.action === "PUBLISH" ? "PUBLISHED" : "REJECTED" },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
