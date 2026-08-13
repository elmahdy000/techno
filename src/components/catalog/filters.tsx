"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { link } from "@/lib/links";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { FacetAttribute } from "@/lib/catalog";

export function CatalogFilters({
  brands,
  facets,
}: {
  brands: string[];
  facets: FacetAttribute[];
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedBrands = searchParams.getAll("brand");
  const attrFilters = new Map<string, string>();
  for (const f of facets) {
    const v = searchParams.get(`attr.${f.slug}`);
    if (v) attrFilters.set(f.slug, v);
  }
  const minPrice = searchParams.get("min") ?? "";
  const maxPrice = searchParams.get("max") ?? "";
  const inStock = searchParams.get("stock") === "1";

  const [minInput, setMinInput] = useState(minPrice);
  const [maxInput, setMaxInput] = useState(maxPrice);

  function update(next: Record<string, string | string[] | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      params.delete(key);
      if (value === null) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, v));
      } else {
        params.set(key, value);
      }
    }
    params.delete("page");
    router.push(`${link(locale, pathname.replace(`/${locale}`, ""))}?${params.toString()}`);
  }

  function toggleBrand(brand: string, checked: boolean) {
    const brands = checked
      ? [...selectedBrands, brand]
      : selectedBrands.filter((b) => b !== brand);
    update({ brand: brands.length ? brands : null });
  }

  function setAttr(slug: string, value: string) {
    update({ [`attr.${slug}`]: value || null });
  }

  function applyPrice() {
    update({
      min: minInput || null,
      max: maxInput || null,
    });
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("brand");
    for (const f of facets) params.delete(`attr.${f.slug}`);
    params.delete("min");
    params.delete("max");
    params.delete("stock");
    params.delete("sort");
    router.push(`${link(locale, pathname.replace(`/${locale}`, ""))}?${params.toString()}`);
  }

  const hasActiveFilters =
    selectedBrands.length > 0 ||
    attrFilters.size > 0 ||
    minPrice !== "" ||
    maxPrice !== "" ||
    inStock;

  return (
    <div className="space-y-5 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          <SlidersHorizontal className="h-4 w-4" />
          {t.filters.heading}
        </h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="text-destructive" onClick={clearAll}>
            {t.filters.clearAll}
          </Button>
        )}
      </div>

      {brands.length > 0 && (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t.filters.brand}</p>
            <div className="max-h-56 space-y-2 overflow-auto">
              {brands.map((brand) => (
                <div key={brand} className="flex items-center gap-2">
                  <Checkbox
                    id={`brand-${brand}`}
                    checked={selectedBrands.includes(brand)}
                    onCheckedChange={(c) => toggleBrand(brand, c === true)}
                  />
                  <Label htmlFor={`brand-${brand}`} className="text-sm font-normal">
                    {brand}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {facets.map((f) => (
        <div key={f.id} className="space-y-2">
          <p className="text-sm font-medium">
            {locale === "ar" && f.nameAr ? f.nameAr : f.name}
          </p>
          <select
            value={attrFilters.get(f.slug) ?? ""}
            onChange={(e) => setAttr(f.slug, e.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          >
            <option value="">{t.filters.all}</option>
            {f.options.map((o) => (
              <option key={o} value={o}>
                {o}
                {f.unit ? ` ${f.unit}` : ""}
              </option>
            ))}
          </select>
        </div>
      ))}

      {facets.length > 0 && <Separator />}

      <div className="space-y-2">
        <p className="text-sm font-medium">{t.filters.priceRange}</p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={t.filters.minPrice}
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
          />
          <Input
            type="number"
            placeholder={t.filters.maxPrice}
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
          />
        </div>
        <Button size="sm" variant="secondary" className="w-full" onClick={applyPrice}>
          {t.filters.apply}
        </Button>
      </div>

      <Separator />

      <div className="flex items-center gap-2">
        <Checkbox
          id="in-stock"
          checked={inStock}
          onCheckedChange={(c) => update({ stock: c === true ? "1" : null })}
        />
        <Label htmlFor="in-stock" className="text-sm font-normal">
          {t.filters.inStockOnly}
        </Label>
      </div>
    </div>
  );
}
