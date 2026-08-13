import { Locale } from "@/i18n/config";

// Build a locale-prefixed path for internal links
export function link(locale: string, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean}`;
}

export function dirOf(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

// Pick a bilingual field based on locale
export function pickL(
  locale: string,
  en: string | null | undefined,
  ar: string | null | undefined,
): string {
  if (locale === "ar" && ar) return ar;
  return en ?? "";
}

export function isArabic(locale: string): boolean {
  return locale === "ar";
}
