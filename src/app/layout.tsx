import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { isLocale } from "@/i18n/config";
import "./globals.css";

import { RegisterServiceWorker } from "@/components/pwa/register-sw";

export const metadata: Metadata = {
  title: {
    default: "TechnoMarket — Multi-Vendor Tech Marketplace",
    template: "%s · TechnoMarket",
  },
  description:
    "Laptops, desktops, components, accessories and spare parts from multiple trusted vendors in one marketplace.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TechnoMarket",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#6d28d9",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

  // Prefer the locale forwarded by middleware from the URL path; fall back to
  // the persisted cookie, then the default locale. This keeps <html dir/lang>
  // in sync even when a user lands directly on /ar/... without a cookie.
  const pathLocale = headerStore.get("x-locale");
  const cookieLocale = cookieStore.get("locale")?.value;
  const locale =
    (pathLocale && isLocale(pathLocale) && pathLocale) ||
    (cookieLocale && isLocale(cookieLocale) && cookieLocale) ||
    "en";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
