"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { getErrorMessage } from "@/i18n/errors";
import { setCommissionRate, setVendorCommissionRate } from "@/lib/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DefaultCommissionForm({ locale, currentRate }: { locale: string; currentRate: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rate, setRate] = useState(String((currentRate * 100).toFixed(1)));

  function submit() {
    const parsed = Number(rate);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      toast.error(t.common.error);
      return;
    }
    startTransition(async () => {
      try {
        await setCommissionRate(locale, { rate: parsed / 100 });
        toast.success(t.common.success);
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, t));
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label>{t.admin.defaultCommissionRate}</Label>
        <Input
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="w-28"
        />
      </div>
      <Button onClick={submit} disabled={pending}>
        {t.common.saveChanges}
      </Button>
    </div>
  );
}

export function VendorCommissionForm({
  locale,
  vendorId,
  currentRate,
  defaultRate,
}: {
  locale: string;
  vendorId: string;
  currentRate: number | null;
  defaultRate: number;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rate, setRate] = useState(currentRate != null ? String((currentRate * 100).toFixed(1)) : "");

  function submit() {
    const trimmed = rate.trim();
    let value: number | null = null;
    if (trimmed !== "") {
      const parsed = Number(trimmed);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
        toast.error(t.common.error);
        return;
      }
      value = parsed / 100;
    }
    startTransition(async () => {
      try {
        await setVendorCommissionRate(locale, { vendorId, rate: value });
        toast.success(t.common.success);
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, t));
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label>{t.admin.overrideCommissionRate}</Label>
        <Input
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="w-28"
          placeholder={`${(defaultRate * 100).toFixed(1)}%`}
        />
      </div>
      <Button size="sm" onClick={submit} disabled={pending}>
        {t.common.save}
      </Button>
    </div>
  );
}
