// Client-safe money formatting (no server env access)
const CURRENCY = "EGP";

export function formatMoneyClient(minor: number, locale: string = "en"): string {
  const loc = locale === "ar" ? "ar-EG" : "en-EG";
  return new Intl.NumberFormat(loc, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}
