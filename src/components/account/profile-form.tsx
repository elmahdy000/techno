"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { updateProfile } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  locale,
  name,
  phone,
}: {
  locale: string;
  name: string;
  phone: string;
}) {
  const { t } = useI18n();
  const [fullName, setFullName] = useState(name);
  const [phoneInput, setPhoneInput] = useState(phone);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateProfile(locale, { name: fullName, phone: phoneInput });
        toast.success(t.common.success);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t.common.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4 rounded-lg border p-5">
      <div className="space-y-2">
        <Label htmlFor="p-name">{t.auth.fullName}</Label>
        <Input id="p-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="p-phone">{t.common.phone}</Label>
        <Input id="p-phone" dir="ltr" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} />
      </div>
      <Button type="submit" disabled={pending}>
        {t.common.saveChanges}
      </Button>
    </form>
  );
}
