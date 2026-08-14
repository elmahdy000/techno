"use client";

import { useState, useTransition, useId } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { getErrorMessage } from "@/i18n/errors";
import { saveAddress } from "@/lib/actions/address-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type AddressData = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  country: string;
  postalCode: string | null;
  isDefault: boolean;
};

export function AddressFormDialog({
  locale,
  address,
  trigger,
}: {
  locale: string;
  address?: AddressData;
  trigger: React.ReactNode;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    fullName: address?.fullName ?? "",
    phone: address?.phone ?? "",
    line1: address?.line1 ?? "",
    line2: address?.line2 ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    postalCode: address?.postalCode ?? "",
    country: address?.country ?? "Egypt",
    isDefault: address?.isDefault ?? false,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await saveAddress(locale, { ...form, id: address?.id });
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {address ? t.checkout.editAddress : t.checkout.newAddress}
          </DialogTitle>
          <DialogDescription>{t.checkout.selectAddress}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${uid}-fullName`}>
                {t.checkout.fullName}
                <span className="ms-0.5 text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                id={`${uid}-fullName`}
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${uid}-phone`}>
                {t.common.phone}
                <span className="ms-0.5 text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                id={`${uid}-phone`}
                required
                dir="ltr"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${uid}-line1`}>
              {t.checkout.addressLine1}
              <span className="ms-0.5 text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id={`${uid}-line1`}
              required
              value={form.line1}
              onChange={(e) => setForm({ ...form, line1: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${uid}-line2`}>{t.checkout.addressLine2}</Label>
            <Input
              id={`${uid}-line2`}
              value={form.line2}
              onChange={(e) => setForm({ ...form, line2: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${uid}-city`}>
                {t.checkout.city}
                <span className="ms-0.5 text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                id={`${uid}-city`}
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${uid}-state`}>{t.checkout.state}</Label>
              <Input
                id={`${uid}-state`}
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${uid}-country`}>
                {t.checkout.country}
                <span className="ms-0.5 text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                id={`${uid}-country`}
                required
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${uid}-postal`}>{t.checkout.postalCode}</Label>
              <Input
                id={`${uid}-postal`}
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${uid}-default`}
              checked={form.isDefault}
              onCheckedChange={(c) => setForm({ ...form, isDefault: c === true })}
            />
            <Label htmlFor={`${uid}-default`} className="text-sm font-normal">
              {t.checkout.makeDefault}
            </Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.checkout.saveAddress}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
