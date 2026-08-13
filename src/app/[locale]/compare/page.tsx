import type { Metadata } from "next";
import { getDictionary } from "@/i18n/get-dictionary";
import { CompareView } from "@/components/compare/compare-view";

export const metadata: Metadata = { title: "Compare" };

export default async function ComparePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);

  return (
    <div className="container py-8">
      <h1 className="mb-2 text-2xl font-bold">{t.product.compareTitle}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t.product.compareHint}</p>
      <CompareView />
    </div>
  );
}
