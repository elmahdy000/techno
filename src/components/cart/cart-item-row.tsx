"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { getErrorMessage } from "@/i18n/errors";
import { link } from "@/lib/links";
import { updateCartItem, removeCartItem } from "@/lib/actions/cart-actions";
import { formatMoneyClient } from "@/lib/client-money";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CartLineData = {
  id: string;
  quantity: number;
  productSlug: string;
  productName: string;
  productNameAr: string | null;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  price: number;
  stock: number;
};

export function CartItemRow({
  item,
  locale,
}: {
  item: CartLineData;
  locale: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [qty, setQty] = useState(item.quantity);

  function change(delta: number) {
    const next = Math.max(1, Math.min(qty + delta, item.stock));
    if (next === qty) return;
    setQty(next);
    startTransition(async () => {
      try {
        await updateCartItem(locale, item.id, next);
        router.refresh();
      } catch (err) {
        setQty(qty);
        toast.error(getErrorMessage(err, t));
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try {
        await removeCartItem(locale, item.id);
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, t));
      }
    });
  }

  const name = locale === "ar" && item.productNameAr ? item.productNameAr : item.productName;

  return (
    <div className="flex gap-3 rounded-lg border p-3 sm:gap-4 sm:p-4">
      <Link
        href={link(locale, `/product/${item.productSlug}`)}
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted sm:h-20 sm:w-20"
      >
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={name} className="h-full w-full object-cover" />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          href={link(locale, `/product/${item.productSlug}`)}
          className="line-clamp-1 text-sm font-medium hover:underline"
        >
          {name}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {item.variantName} · {t.common.sku}: {item.sku ?? ""}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => change(-1)} disabled={pending || qty <= 1} aria-label={t.cart.decreaseQty}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-8 text-center text-sm font-medium">{qty}</span>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => change(1)} disabled={pending || qty >= item.stock} aria-label={t.cart.increaseQty}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-bold sm:text-base")}>{formatMoneyClient(item.price * qty, locale)}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={remove} aria-label={t.common.delete ?? "Remove item"}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
