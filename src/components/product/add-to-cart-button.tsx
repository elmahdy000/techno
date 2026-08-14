"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale, useT } from "@/i18n/client";
import { addToCart } from "@/lib/actions/cart-actions";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/i18n/errors";

export function AddToCartButton({
  variantId,
  stock,
  quantity = 1,
  className,
  children,
}: {
  variantId: string;
  stock: number;
  quantity?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (stock <= 0) {
    return (
      <Button disabled variant="outline" className={className} size="lg">
        {t.product.outOfStock}
      </Button>
    );
  }

  return (
    <Button
      size="lg"
      className={className}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await addToCart(locale, { variantId, quantity });
            toast.success(t.cart.added);
            router.refresh();
          } catch (err) {
            toast.error(getErrorMessage(err, t));
          }
        })
      }
    >
      {children ?? t.product.addToCart}
    </Button>
  );
}
