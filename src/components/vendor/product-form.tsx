"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { getErrorMessage } from "@/i18n/errors";
import { saveProduct } from "@/lib/actions/vendor-actions";
import { link, pickL } from "@/lib/links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/vendor/image-upload";
import { cn } from "@/lib/utils";

type CategoryData = {
  id: string;
  name: string;
  nameAr: string | null;
  parent?: { name: string; nameAr: string | null } | null;
};

type AttributeData = {
  id: string;
  name: string;
  nameAr: string | null;
  type: string;
  unit: string | null;
  options: unknown;
};

type VariantForm = {
  id?: string;
  sku: string;
  name: string;
  price: string;
  compareAtPrice: string;
  stock: string;
};

export type ProductFormData = {
  id?: string;
  name: string;
  nameAr: string;
  brand: string;
  model: string;
  categoryId: string;
  shortDescription: string;
  shortDescriptionAr: string;
  description: string;
  warranty: string;
  status: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
  featured: boolean;
  images: string[];
  variants: VariantForm[];
  specs: Record<string, string>;
};

function emptyVariant(): VariantForm {
  return { sku: "", name: "", price: "", compareAtPrice: "", stock: "0" };
}

export function ProductForm({
  locale,
  categories,
  attributes,
  initial,
}: {
  locale: string;
  categories: CategoryData[];
  attributes: AttributeData[];
  initial?: ProductFormData;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<ProductFormData>(
    initial ?? {
      name: "",
      nameAr: "",
      brand: "",
      model: "",
      categoryId: categories[0]?.id ?? "",
      shortDescription: "",
      shortDescriptionAr: "",
      description: "",
      warranty: "",
      status: "DRAFT",
      featured: false,
      images: [],
      variants: [emptyVariant()],
      specs: {},
    },
  );

  function set<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setVariant(i: number, key: keyof VariantForm, value: string) {
    setForm((f) => {
      const variants = f.variants.map((v, idx) => (idx === i ? { ...v, [key]: value } : v));
      return { ...f, variants };
    });
  }

  function addVariant() {
    setForm((f) => ({ ...f, variants: [...f.variants, emptyVariant()] }));
  }

  function removeVariant(i: number) {
    if (form.variants.length <= 1) return;
    setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.categoryId) {
      toast.error(t.common.error);
      return;
    }
    if (form.variants.some((v) => !v.sku.trim() || !v.name.trim() || !v.price)) {
      toast.error(t.common.error);
      return;
    }
    startTransition(async () => {
      try {
        const res = await saveProduct(locale, {
          id: form.id,
          categoryId: form.categoryId,
          name: form.name,
          nameAr: form.nameAr,
          brand: form.brand,
          model: form.model,
          shortDescription: form.shortDescription,
          shortDescriptionAr: form.shortDescriptionAr,
          description: form.description,
          warranty: form.warranty,
          status: form.status,
          featured: form.featured,
          images: form.images,
          variants: form.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            name: v.name,
            price: Number(v.price) || 0,
            compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) || 0 : null,
            stock: Number(v.stock) || 0,
          })),
          specs: form.specs,
        });
        toast.success(initial ? t.vendor.productUpdated : t.vendor.productCreated);
        router.push(link(locale, "/vendor/products"));
        router.refresh();
        void res;
      } catch (err) {
        toast.error(getErrorMessage(err, t));
      }
    });
  }

  const visibleAttributes = attributes;

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.vendor.variants}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>{t.common.name}</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t.vendor.productNamePlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.vendor.nameInArabic}</Label>
              <Input
                dir="rtl"
                value={form.nameAr}
                onChange={(e) => set("nameAr", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.common.brand}</Label>
              <Input
                required
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.common.model}</Label>
              <Input
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.vendor.categories}</Label>
              <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.parent ? `${pickL(locale, c.parent.name, c.parent.nameAr)} / ` : ""}
                      {pickL(locale, c.name, c.nameAr)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.vendor.visibility}</Label>
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v as ProductFormData["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">{t.vendor.productStatusDraft}</SelectItem>
                  <SelectItem value="ACTIVE">{t.vendor.productStatusActive}</SelectItem>
                  <SelectItem value="INACTIVE">{t.vendor.productStatusInactive}</SelectItem>
                  <SelectItem value="ARCHIVED">{t.vendor.productStatusArchived}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.common.description}</Label>
              <Textarea
                rows={3}
                value={form.shortDescription}
                onChange={(e) => set("shortDescription", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.vendor.descriptionInArabic}</Label>
              <Textarea
                dir="rtl"
                rows={3}
                value={form.shortDescriptionAr}
                onChange={(e) => set("shortDescriptionAr", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t.common.details}</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.vendor.warranty ?? "Warranty"}</Label>
              <Input
                value={form.warranty}
                onChange={(e) => set("warranty", e.target.value)}
                placeholder={t.vendor.warrantyPlaceholder}
              />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Checkbox
                id="p-featured"
                checked={form.featured}
                onCheckedChange={(c) => set("featured", c === true)}
              />
              <Label htmlFor="p-featured" className="text-sm font-normal">
                {t.vendor.featured}
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            {t.vendor.images}
            <span className="text-xs font-normal text-muted-foreground">
              {form.images.length}/8
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUpload images={form.images} onChange={(urls) => set("images", urls)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.vendor.variants}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.variants.map((v, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {t.vendor.variants} #{i + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => removeVariant(i)}
                  disabled={form.variants.length <= 1}
                >
                  <X className="h-3.5 w-3.5" />
                  {t.common.delete}
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.common.sku}</Label>
                  <Input
                    required
                    dir="ltr"
                    value={v.sku}
                    onChange={(e) => setVariant(i, "sku", e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.common.name}</Label>
                  <Input
                    required
                    value={v.name}
                    onChange={(e) => setVariant(i, "name", e.target.value)}
                    placeholder={t.vendor.variantNamePlaceholder}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {t.vendor.price} ({t.misc.egp})
                  </Label>
                  <Input
                    required
                    type="number"
                    min={0}
                    step="0.01"
                    dir="ltr"
                    value={v.price}
                    onChange={(e) => setVariant(i, "price", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {t.vendor.comparePrice}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    dir="ltr"
                    value={v.compareAtPrice}
                    onChange={(e) => setVariant(i, "compareAtPrice", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.vendor.stock}</Label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    dir="ltr"
                    value={v.stock}
                    onChange={(e) => setVariant(i, "stock", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addVariant}>
            <Plus className="h-4 w-4" />
            {t.common.add} {t.vendor.variants}
          </Button>
        </CardContent>
      </Card>

      {visibleAttributes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.vendor.specs}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleAttributes.map((a) => {
              const options = Array.isArray(a.options) ? (a.options as string[]) : [];
              const value = form.specs[a.id] ?? "";
              return (
                <div key={a.id} className="space-y-1.5">
                  <Label className="text-xs">
                    {pickL(locale, a.name, a.nameAr)}
                    {a.unit ? ` (${a.unit})` : ""}
                  </Label>
                  {a.type === "SELECT" && options.length > 0 ? (
                    <Select
                      value={value}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, specs: { ...f.specs, [a.id]: v } }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.common.none} />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      dir={a.type === "NUMBER" ? "ltr" : undefined}
                      value={value}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, specs: { ...f.specs, [a.id]: e.target.value } }))
                      }
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={pending}
        >
          {t.common.cancel}
        </Button>
        <Button type="submit" disabled={pending} className={cn(pending && "opacity-70")}>
          {pending ? t.misc.processing : t.common.save}
        </Button>
      </div>
    </form>
  );
}
