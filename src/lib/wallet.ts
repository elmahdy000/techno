import { prisma } from "@/lib/prisma";
import type { LedgerType, Prisma } from "@prisma/client";

export type WalletResult = {
  ok: boolean;
  error?: string;
};

async function ensureWallet(vendorId: string, db: Prisma.TransactionClient | typeof prisma = prisma) {
  return db.wallet.upsert({
    where: { vendorId },
    create: { vendorId },
    update: {},
  });
}

// Reverse credit on refund/cancellation: debit available first, then pending.
// Returns ok:false with a message if the wallet lacks sufficient funds.
export async function reverseVendorCredit(
  vendorId: string,
  orderItemId: string,
  amountMinor: number,
  reason: string,
  tx?: Prisma.TransactionClient,
): Promise<WalletResult> {
  if (amountMinor <= 0) return { ok: true };
  const db = tx ?? prisma;
  const wallet = await ensureWallet(vendorId, db);

  const fromAvailable = Math.min(wallet.availableBalance, amountMinor);
  const fromPending = amountMinor - fromAvailable;

  if (fromAvailable > 0) {
    const res = await db.wallet.updateMany({
      where: { id: wallet.id, availableBalance: { gte: fromAvailable } },
      data: {
        availableBalance: { decrement: fromAvailable },
        lifetimeEarned: { decrement: fromAvailable },
      },
    });
    if (res.count === 0) {
      return { ok: false, error: "Insufficient available balance" };
    }
  }
  if (fromPending > 0) {
    const res = await db.wallet.updateMany({
      where: { id: wallet.id, pendingBalance: { gte: fromPending } },
      data: { pendingBalance: { decrement: fromPending } },
    });
    if (res.count === 0) {
      return { ok: false, error: "Insufficient pending balance" };
    }
  }

  const updated = await db.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
  await db.ledgerEntry.create({
    data: {
      walletId: wallet.id,
      vendorId,
      type: "ORDER_REVERSAL",
      amount: -amountMinor,
      balanceAfter: updated.availableBalance,
      orderItemId,
      reference: reason,
      description: reason,
    },
  });
  return { ok: true };
}

export async function debitWalletForWithdrawal(
  vendorId: string,
  amountMinor: number,
  withdrawalId: string,
  tx?: Prisma.TransactionClient,
): Promise<WalletResult> {
  if (amountMinor <= 0) {
    return { ok: false, error: "Invalid withdrawal amount" };
  }
  const db = tx ?? prisma;
  const wallet = await db.wallet.upsert({
    where: { vendorId },
    create: { vendorId },
    update: {},
  });

  // Atomic conditional debit: only succeeds when the balance is sufficient.
  // Guards against TOCTOU races between concurrent approvals.
  const result = await db.wallet.updateMany({
    where: { id: wallet.id, availableBalance: { gte: amountMinor } },
    data: {
      availableBalance: { decrement: amountMinor },
      lifetimeWithdrawn: { increment: amountMinor },
    },
  });
  if (result.count === 0) {
    return { ok: false, error: "Insufficient available balance" };
  }

  const updated = await db.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
  await db.ledgerEntry.create({
    data: {
      walletId: wallet.id,
      vendorId,
      type: "WITHDRAWAL" as LedgerType,
      amount: -amountMinor,
      balanceAfter: updated.availableBalance,
      withdrawalId,
      reference: `Withdrawal #${withdrawalId}`,
      description: "Withdrawal payout",
    },
  });
  return { ok: true };
}
