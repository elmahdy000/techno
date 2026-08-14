"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useLocale, useT } from "@/i18n/client";
import { addWishlistToCart } from "@/lib/actions/wishlist-actions";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/i18n/errors";

export function AddWishlistToCart() {
  const t = useT();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await addWishlistToCart(locale);
            toast.success(t.cart.added);
          } catch (err) {
            toast.error(getErrorMessage(err, t));
          }
        })
      }
    >
      {t.wishlist.addAllToCart}
    </Button>
  );
}
