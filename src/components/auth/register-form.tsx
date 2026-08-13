"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { link } from "@/lib/links";
import { registerUser } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function RegisterForm() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [becomeVendor, setBecomeVendor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError(t.auth.passwordHint);
      return;
    }
    startTransition(async () => {
      const res = await registerUser(locale, {
        name,
        email,
        phone,
        password,
        becomeVendor,
      });
      if (res && !res.ok) {
        setError(t.auth.registerError);
        return;
      }
      toast.success(t.common.success);
      router.push(link(locale, becomeVendor ? "/vendor" : "/account"));
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">{t.auth.fullName}</Label>
        <Input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t.auth.email}</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          dir="ltr"
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">{t.auth.phone}</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          dir="ltr"
          autoComplete="tel"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t.auth.password}</Label>
        <Input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">{t.auth.passwordHint}</p>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="become-vendor"
          checked={becomeVendor}
          onCheckedChange={(c) => setBecomeVendor(c === true)}
        />
        <Label htmlFor="become-vendor" className="text-sm font-normal">
          {t.auth.wantVendor}
        </Label>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {t.auth.register}
      </Button>
    </form>
  );
}
