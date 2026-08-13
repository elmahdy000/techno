"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { respondToReview } from "@/lib/actions/vendor-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RespondReviewDialog({
  locale,
  reviewId,
  existing,
}: {
  locale: string;
  reviewId: string;
  existing?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState(existing ?? "");

  function submit() {
    if (body.trim().length < 3) {
      toast.error(t.common.error);
      return;
    }
    startTransition(async () => {
      try {
        await respondToReview(locale, { reviewId, body });
        toast.success(t.common.success);
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t.common.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {existing ? t.common.edit : t.vendor.respondReview}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.vendor.respondReview}</DialogTitle>
          <DialogDescription>{t.vendor.reviews}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t.common.description}</Label>
            <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <Button className="w-full" disabled={pending} onClick={submit}>
            {t.common.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
