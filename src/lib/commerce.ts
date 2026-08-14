import { cache } from "react";
import { randomBytes } from "node:crypto";
import type { Vendor } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { percentOf } from "@/lib/money";

export const FREE_SHIPPING_THRESHOLD_MINOR = 5_000_00; // free shipping over 5,000 EGP
export const DEFAULT_SHIPPING_FEE_MINOR = 100_00;

export const getDefaultCommissionRate = cache(async (): Promise<number> => {
  const row = await prisma.commissionConfig.findUnique({
    where: { key: "default_commission_rate" },
  });
  return row ? row.value : Number(process.env.DEFAULT_COMMISSION_RATE ?? 0.07);
});

export function getVendorCommissionRate(
  vendor: Pick<Vendor, "commissionRate"> | null | undefined,
  defaultRate: number,
): number {
  return vendor?.commissionRate ?? defaultRate;
}

export type CommissionSnapshot = {
  rate: number;
  commissionAmount: number;
  vendorNet: number;
};

export function computeItemCommission(
  unitPriceMinor: number,
  quantity: number,
  rate: number,
): CommissionSnapshot {
  const lineTotal = unitPriceMinor * quantity;
  const commissionAmount = percentOf(lineTotal, rate);
  // Both operands are integers in minor units, so the difference is exact:
  // commissionAmount + vendorNet === lineTotal with no rounding drift.
  return {
    rate,
    commissionAmount,
    vendorNet: lineTotal - commissionAmount,
  };
}

export type OrderTotals = {
  subtotal: number;
  shippingFee: number;
  discount: number;
  taxAmount: number;
  total: number;
};

export function computeOrderTotals(
  items: Array<{ unitPriceMinor: number; quantity: number }>,
  opts?: { discountMinor?: number; taxRate?: number },
): OrderTotals {
  const subtotal = items.reduce(
    (acc, i) => acc + i.unitPriceMinor * i.quantity,
    0,
  );
  const discount = opts?.discountMinor ?? 0;
  const shippingFee =
    subtotal - discount >= FREE_SHIPPING_THRESHOLD_MINOR
      ? 0
      : DEFAULT_SHIPPING_FEE_MINOR;
  const taxRate = opts?.taxRate ?? 0;
  const taxAmount = Math.round((subtotal - discount) * taxRate);
  const total = subtotal - discount + shippingFee + taxAmount;
  return { subtotal, shippingFee, discount, taxAmount, total };
}

export function nextOrderNumber(): string {
  const now = new Date();
  const ymd = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `TM-${ymd}-${rand}`;
}

export function nextTicketNumber(): string {
  return `TKT-${Date.now().toString(36).toUpperCase()}`;
}
