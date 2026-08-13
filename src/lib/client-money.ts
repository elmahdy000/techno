// Client-safe money formatting (no server env access)
const CURRENCY = "EGP";

export function formatMoneyClient(minor: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}
