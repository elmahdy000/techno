import { prisma } from "@/lib/prisma";
import type { LedgerType } from "@prisma/client";

export type WalletResult = {
  ok: boolean;
  error?: string;
};

async function ensureWallet(vendorId: string) {
  return prisma.wallet.upsert({
    where: { vendorId },
    create: { vendorId },
    update: {},
  });
}

export async function creditVendorOrder(
  vendorId: string,
  amountMinor: number,
  orderItemId: string,
  reference: string,
): Promise<WalletResult> {
  if (amountMinor <= 0) return { ok: true };
  const wallet = await ensureWallet(vendorId);
  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { pendingBalance: { increment: amountMinor } },
    }),
    prisma.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        vendorId,
        type: "ORDER_CREDIT",
        amount: amountMinor,
        balanceAfter: wallet.pendingBalance + amountMinor,
        orderItemId,
        reference,
        description: "Order credit (pending settlement)",
      },
    }),
  ]);
  return { ok: true };
}

// Called when an order item is delivered: pending -> available
export async function settleVendorFunds(
  vendorId: string,
  orderItemId: string,
  amountMinor: number,
): Promise<WalletResult> {
  if (amountMinor <= 0) return { ok: true };
  const wallet = await ensureWallet(vendorId);
  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        pendingBalance: { decrement: amountMinor },
        availableBalance: { increment: amountMinor },
        lifetimeEarned: { increment: amountMinor },
      },
    }),
    prisma.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        vendorId,
        type: "ORDER_CREDIT",
        amount: amountMinor,
        balanceAfter: wallet.availableBalance + amountMinor,
        orderItemId,
        description: "Funds settled to available balance",
      },
    }),
  ]);
  return { ok: true };
}

// Reverse credit on refund/cancellation: debit available first, then pending
export async function reverseVendorCredit(
  vendorId: string,
  orderItemId: string,
  amountMinor: number,
  reason: string,
): Promise<WalletResult> {
  if (amountMinor <= 0) return { ok: true };
  const wallet = await ensureWallet(vendorId);
  const fromAvailable = Math.min(wallet.availableBalance, amountMinor);
  const fromPending = amountMinor - fromAvailable;
  const ops: Array<Parameters<typeof prisma.wallet.update>[0]> = [];

  if (fromAvailable > 0) {
    ops.push({
      where: { id: wallet.id },
      data: {
        availableBalance: { decrement: fromAvailable },
        lifetimeEarned: { decrement: fromAvailable },
      },
    });
  }
  if (fromPending > 0) {
    ops.push({
      where: { id: wallet.id },
      data: { pendingBalance: { decrement: fromPending } },
    });
  }

  if (ops.length === 0) return { ok: true };

  await prisma.$transaction([
    ...ops.map((op) => prisma.wallet.update(op)),
    prisma.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        vendorId,
        type: "ORDER_REVERSAL",
        amount: -amountMinor,
        balanceAfter: Math.max(
          wallet.availableBalance - fromAvailable + wallet.pendingBalance - fromPending,
          0,
        ),
        orderItemId,
        reference: reason,
        description: reason,
      },
    }),
  ]);
  return { ok: true };
}

export async function debitWalletForWithdrawal(
  vendorId: string,
  amountMinor: number,
  withdrawalId: string,
): Promise<WalletResult> {
  const wallet = await ensureWallet(vendorId);
  if (wallet.availableBalance < amountMinor) {
    return { ok: false, error: "Insufficient available balance" };
  }
  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: { decrement: amountMinor },
        lifetimeWithdrawn: { increment: amountMinor },
      },
    }),
    prisma.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        vendorId,
        type: "WITHDRAWAL" as LedgerType,
        amount: -amountMinor,
        balanceAfter: wallet.availableBalance - amountMinor,
        withdrawalId,
        reference: `Withdrawal #${withdrawalId}`,
        description: "Withdrawal payout",
      },
    }),
  ]);
  return { ok: true };
}
