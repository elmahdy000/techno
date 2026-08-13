"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { link } from "@/lib/links";
import { formatMoney } from "@/lib/money";
import { addToCart } from "@/lib/actions/cart-actions";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PurchaseVariant = {
  id: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  options: Record<string, string> | null;
};

export function PurchaseBox({
  variants,
}: {
  variants: PurchaseVariant[];
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [selection, setSelection] = useState<Record<string, string>>(
    () => variants[0]?.options ?? {},
  );
  const [buying, setBuying] = useState(false);

  const optionGroups = useMemo(() => {
    const groups = new Map<string, Set<string>>();
    for (const v of variants) {
      if (!v.options) continue;
      for (const [key, value] of Object.entries(v.options)) {
        if (!groups.has(key)) groups.set(key, new Set());
        groups.get(key)!.add(value);
      }
    }
    return Array.from(groups.entries()).map(([key, values]) => ({
      key,
      values: Array.from(values),
    }));
  }, [variants]);

  const selected = useMemo(() => {
    if (optionGroups.length === 0) return variants[0] ?? null;
    return (
      variants.find((v) =>
        v.options &&
        optionGroups.every((g) => v.options![g.key] === selection[g.key]),
      ) ?? variants[0] ?? null
    );
  }, [variants, selection, optionGroups]);

  const stock = selected?.stock ?? 0;

  function chooseOption(key: string, value: string) {
    setSelection((prev) => ({ ...prev, [key]: value }));
  }

  async function buyNow() {
    if (!selected) return;
    setBuying(true);
    try {
      await addToCart(locale, { variantId: selected.id, quantity: 1 });
      router.push(link(locale, "/checkout"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
      setBuying(false);
    }
  }

  return (
    <div className="space-y-4">
      {optionGroups.map((group) => (
        <div key={group.key}>
          <p className="mb-2 text-sm font-medium">{group.key}</p>
          <div className="flex flex-wrap gap-2">
            {group.values.map((value) => {
              const active =
                selected?.options && selected.options[group.key] === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => chooseOption(group.key, value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "hover:bg-accent",
                  )}
                >
                  {value}
                  {active && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex items-baseline gap-3">
        {selected && (
          <>
            <span className="text-2xl font-bold">{formatMoney(selected.price)}</span>
            {selected.compareAtPrice && selected.compareAtPrice > selected.price && (
              <span className="text-muted-foreground line-through">
                {formatMoney(selected.compareAtPrice)}
              </span>
            )}
          </>
        )}
      </div>

      <p
        className={cn(
          "text-sm",
          stock <= 0 ? "font-medium text-destructive" : "text-muted-foreground",
        )}
      >
        {stock <= 0
          ? t.product.outOfStock
          : stock <= 5
            ? t.common.lowStock.replace("{n}", String(stock))
            : t.common.inStock}
      </p>

      <div className="flex gap-2">
        {selected && (
          <AddToCartButton variantId={selected.id} stock={stock} className="flex-1">
            {t.product.addToCart}
          </AddToCartButton>
        )}
        <Button
          size="lg"
          variant="secondary"
          className="flex-1"
          disabled={!selected || stock <= 0 || buying}
          onClick={buyNow}
        >
          {buying && <Loader2 className="h-4 w-4 animate-spin" />}
          {t.cart.buyNow}
        </Button>
      </div>
    </div>
  );
}
