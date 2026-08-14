"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui/button";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    // Surface the error for observability without leaking details to the user
    console.error(error);
  }, [error]);

  return (
    <div className="container flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-2xl font-bold">{t.common.error}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{t.errors.default}</p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>{t.common.retry}</Button>
        <Button variant="outline" onClick={() => router.refresh()}>
          {t.common.back}
        </Button>
      </div>
    </div>
  );
}
