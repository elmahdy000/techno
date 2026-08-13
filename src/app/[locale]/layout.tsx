import { getDictionary } from "@/i18n/get-dictionary";
import { I18nProvider } from "@/i18n/client";
import { isLocale } from "@/i18n/config";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/ui/sonner";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(safeLocale);

  return (
    <I18nProvider locale={safeLocale} t={dict}>
      <div className="flex min-h-screen flex-col">
        <Header locale={safeLocale} />
        <main className="flex-1">{children}</main>
        <Footer locale={safeLocale} />
      </div>
      <Toaster richColors position="top-center" />
    </I18nProvider>
  );
}
