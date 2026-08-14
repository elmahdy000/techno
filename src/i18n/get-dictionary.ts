import "server-only";
import en, { type Dictionary } from "@/i18n/dictionaries/en";
import ar from "@/i18n/dictionaries/ar";
import { isLocale, type Locale } from "@/i18n/config";

const dictionaries: Record<Locale, Dictionary> = { en, ar };

export function getDictionary(locale: string | undefined): Dictionary {
  const l = locale ?? "";
  return isLocale(l) ? dictionaries[l] : en;
}

export function pageTitle(
  locale: string | undefined,
  key: keyof Dictionary["titles"],
): string {
  return getDictionary(locale).titles[key];
}
