"use client";

import { createContext, useContext } from "react";
import { getDir, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

type I18nContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: Dictionary;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  t,
  children,
}: {
  locale: Locale;
  t: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, dir: getDir(locale), t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

export function useLocale(): Locale {
  return useI18n().locale;
}

export function useT(): Dictionary {
  return useI18n().t;
}
