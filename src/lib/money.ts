export const MINOR_UNITS = 100;
export const CURRENCY = process.env.CURRENCY ?? "EGP";

// Convert a float amount (e.g. 20000.00) to minor units (2000000)
export function toMinor(amount: number): number {
  return Math.round(amount * MINOR_UNITS);
}

// Convert minor units back to a float amount
export function fromMinor(minor: number): number {
  return minor / MINOR_UNITS;
}

export function roundMoney(value: number): number {
  return Math.round(value);
}

export function formatMoney(
  minor: number,
  currency: string = CURRENCY,
): string {
  const amount = fromMinor(minor);
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatMoneyShort(minor: number, currency: string = CURRENCY) {
  const amount = fromMinor(minor);
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function percentOf(value: number, rate: number): number {
  return roundMoney(value * rate);
}
