"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
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
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (body.trim().length < 10) {
      toast.error(t.product.reviews.replace("{count}", ""));
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
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t.common.error);
      }
    });
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
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
