"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { getErrorMessage } from "@/i18n/errors";
import { updateVendorProfile } from "@/lib/actions/vendor-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/vendor/image-upload";

export function VendorProfileForm({
  locale,
  initial,
}: {
  locale: string;
  initial: {
    name: string;
    description: string;
    email: string;
    phone: string;
    logo: string;
    cover: string;
  };
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(initial);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateVendorProfile(locale, form);
        toast.success(t.common.success);
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, t));
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.vendor.profile}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.common.name}</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.common.email}</Label>
              <Input
                type="email"
                dir="ltr"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.common.phone}</Label>
              <Input
                dir="ltr"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t.common.description}</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t.vendor.images}</Label>
            <ImageUpload
              images={form.logo ? [form.logo] : []}
              onChange={(urls) => set("logo", urls[0] ?? "")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? t.misc.processing : t.common.saveChanges}
        </Button>
      </div>
    </form>
  );
}
