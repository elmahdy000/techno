"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useT } from "@/i18n/client";
import { toggleWishlist } from "@/lib/actions/wishlist-actions";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/i18n/errors";

export function WishlistButton({
  productId,
  initialInWishlist,
  className,
  size = "icon",
}: {
  productId: string;
  initialInWishlist: boolean;
  className?: string;
  size?: "icon" | "sm";
}) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(initialInWishlist);

  return (
    <button
      type="button"
      aria-label={optimistic ? t.common.removeFromWishlist : t.common.saveToWishlist}
      aria-pressed={optimistic}
      onClick={() => {
        startTransition(async () => {
          setOptimistic(!optimistic);
          try {
            const res = await toggleWishlist(locale, productId);
            toast.success(res.added ? t.common.saved : t.common.removed);
            router.refresh();
          } catch (err) {
            setOptimistic(initialInWishlist);
            toast.error(getErrorMessage(err, t));
          }
        });
      }}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background transition-colors hover:bg-accent",
        size === "sm" && "h-8 w-8",
        className,
      )}
    >
      <Heart
        className={cn(
          "h-4 w-4",
          optimistic && "fill-rose-500 text-rose-500",
          !optimistic && "text-muted-foreground",
        )}
      />
    </button>
  );
}
