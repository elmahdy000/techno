"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { getErrorMessage } from "@/i18n/errors";
import { adjustInventory } from "@/lib/actions/vendor-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AdjustStockDialog({
  locale,
  variantId,
  currentStock,
}: {
  locale: string;
  variantId: string;
  currentStock: number;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [delta, setDelta] = useState("0");
  const [reason, setReason] = useState("");

  function submit() {
    const d = Number(delta);
    if (!Number.isFinite(d) || d === 0) {
      toast.error(t.common.error);
      return;
    }
    if (reason.trim().length < 2) {
      toast.error(t.common.error);
      return;
    }
    startTransition(async () => {
      try {
        await adjustInventory(locale, { variantId, delta: d, reason });
        toast.success(t.common.success);
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, t));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t.vendor.inventory}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.vendor.inventory}</DialogTitle>
          <DialogDescription>
            {t.vendor.stock}: {currentStock}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t.vendor.stock}</Label>
            <Input
              type="number"
              dir="ltr"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder={t.vendor.stockDeltaPlaceholder}
            />
            <p className="text-xs text-muted-foreground">{t.common.details}</p>
          </div>
          <div className="space-y-2">
            <Label>{t.common.description}</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.vendor.stockReasonPlaceholder}
            />
          </div>
          <Button className="w-full" disabled={pending} onClick={submit}>
            {t.common.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
