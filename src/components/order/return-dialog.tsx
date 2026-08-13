"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { requestReturn } from "@/lib/actions/order-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const REASONS = [
  "reasonDefective",
  "reasonNotAsDescribed",
  "reasonWrongItem",
  "reasonChangedMind",
  "reasonOther",
] as const;

export function ReturnRequestDialog({
  locale,
  orderItemId,
  maxQuantity,
}: {
  locale: string;
  orderItemId: string;
  maxQuantity: number;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(1);

  function submit() {
    if (description.trim().length < 10) {
      toast.error(t.common.error);
      return;
    }
    startTransition(async () => {
      try {
        await requestReturn(locale, {
          orderItemId,
          reason,
          description,
          quantity,
        });
        toast.success(t.common.success);
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t.common.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t.order.requestReturn}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.returns.request}</DialogTitle>
          <DialogDescription>{t.returns.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t.returns.reason}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t.returns[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t.returns.quantity}</Label>
            <Input
              type="number"
              min={1}
              max={maxQuantity}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(maxQuantity, Number(e.target.value) || 1)))}
            />
          </div>
          <div className="space-y-2">
            <Label>{t.returns.description}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <Button className="w-full" disabled={pending} onClick={submit}>
            {t.common.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
