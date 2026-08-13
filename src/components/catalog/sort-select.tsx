"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { link } from "@/lib/links";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SortSelect() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort") ?? "relevance";

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "relevance") params.delete("sort");
    else params.set("sort", value);
    params.delete("page");
    router.push(`${link(locale, pathname.replace(`/${locale}`, ""))}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{t.filters.sort}</span>
      <Select value={sort} onValueChange={onChange}>
        <SelectTrigger className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="relevance">{t.filters.sortRelevance}</SelectItem>
          <SelectItem value="newest">{t.filters.sortNewest}</SelectItem>
          <SelectItem value="price_asc">{t.filters.sortPriceAsc}</SelectItem>
          <SelectItem value="price_desc">{t.filters.sortPriceDesc}</SelectItem>
          <SelectItem value="rating">{t.filters.sortRating}</SelectItem>
          <SelectItem value="popular">{t.filters.sortPopular}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
