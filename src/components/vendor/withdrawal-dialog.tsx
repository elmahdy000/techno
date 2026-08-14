"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { getErrorMessage } from "@/i18n/errors";
import { requestWithdrawal } from "@/lib/actions/vendor-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function WithdrawalDialog({
  locale,
  maxMinor,
}: {
  locale: string;
  maxMinor: number;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"BANK_TRANSFER" | "INSTAPAY" | "OTHER">("BANK_TRANSFER");
  const [details, setDetails] = useState("");
  const [note, setNote] = useState("");

  const maxEgp = maxMinor / 100;

  function submit() {
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0 || a * 100 > maxMinor) {
      toast.error(t.common.error);
      return;
    }
    if (details.trim().length < 3) {
      toast.error(t.common.error);
      return;
    }
    startTransition(async () => {
      try {
        await requestWithdrawal(locale, { amount: a, method, accountDetails: details, note });
        toast.success(t.common.success);
        setOpen(false);
        setAmount("");
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, t));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{t.vendor.requestWithdrawal}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.vendor.requestWithdrawal}</DialogTitle>
          <DialogDescription>
            {t.vendor.availableBalance}: {maxEgp.toFixed(2)} {t.misc.egp}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              {t.vendor.withdrawAmount} ({t.misc.egp})
            </Label>
            <Input
              type="number"
              min={1}
              step="0.01"
              dir="ltr"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t.vendor.method ?? "Method"}</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK_TRANSFER">{t.vendor.methodBankTransfer}</SelectItem>
                <SelectItem value="INSTAPAY">{t.vendor.methodInstapay}</SelectItem>
                <SelectItem value="OTHER">{t.vendor.methodOther}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t.common.details}</Label>
            <Textarea
              dir="ltr"
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t.vendor.accountDetailsPlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Label>{t.common.description} ({t.common.optional})</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button className="w-full" disabled={pending} onClick={submit}>
            {t.common.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
