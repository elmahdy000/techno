"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { getErrorMessage } from "@/i18n/errors";
import { submitReview } from "@/lib/actions/review-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function ReviewForm({
  productId,
  orderItemId,
  locale,
}: {
  productId: string;
  orderItemId?: string;
  locale: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (body.trim().length < 10) {
      toast.error(t.product.reviewTooShort);
      return;
    }
    startTransition(async () => {
      try {
        await submitReview(locale, {
          productId,
          rating,
          title,
          body,
          orderItemId: orderItemId ?? "",
        });
        toast.success(t.common.success);
        setTitle("");
        setBody("");
        setRating(5);
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, t));
      }
    });
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-1" role="radiogroup" aria-label={t.product.writeReview}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${t.product.rate} ${n} ${t.common.of} 5`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="rounded-sm p-1"
          >
            <Star
              className={cn(
                "h-6 w-6",
                n <= (hover || rating)
                  ? "fill-amber-400 text-amber-400"
                  : "fill-muted text-muted",
              )}
            />
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="review-title">{t.product.reviewTitle ?? "Title"}</Label>
        <Input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="review-body">{t.product.writeReview}</Label>
        <Textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
        />
      </div>
      <Button onClick={submit} disabled={pending}>
        {t.common.submit}
      </Button>
    </div>
  );
}
