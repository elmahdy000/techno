import type { Vendor } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { percentOf, roundMoney } from "@/lib/money";

export const FREE_SHIPPING_THRESHOLD_MINOR = 5_000_00; // free shipping over 5,000 EGP
export const DEFAULT_SHIPPING_FEE_MINOR = 100_00;

let cachedDefaultRate: number | null = null;

export async function getDefaultCommissionRate(): Promise<number> {
  if (cachedDefaultRate != null) return cachedDefaultRate;
  const row = await prisma.commissionConfig.findUnique({
    where: { key: "default_commission_rate" },
  });
  const rate = row ? row.value : Number(process.env.DEFAULT_COMMISSION_RATE ?? 0.07);
  cachedDefaultRate = rate;
  return rate;
}

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
  return {
    rate,
    commissionAmount,
    vendorNet: roundMoney(lineTotal - commissionAmount),
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
  const taxAmount = roundMoney((subtotal - discount) * taxRate);
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
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TM-${ymd}-${rand}`;
}

export function nextTicketNumber(): string {
  return `TKT-${Date.now().toString(36).toUpperCase()}`;
}
