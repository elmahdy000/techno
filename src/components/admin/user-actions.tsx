"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { getErrorMessage } from "@/i18n/errors";
import { manageUser } from "@/lib/actions/admin-actions";
import { Button } from "@/components/ui/button";

export function UserActionButton({
  locale,
  userId,
  active,
}: {
  locale: string;
  userId: string;
  active: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      try {
        await manageUser(locale, { userId, action: active ? "DEACTIVATE" : "ACTIVATE" });
        toast.success(t.common.success);
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, t));
      }
    });
  }

  return (
    <Button
      size="sm"
      variant={active ? "destructive" : "outline"}
      disabled={pending}
      onClick={run}
    >
      {active ? t.vendor.deactivate : t.vendor.activate}
    </Button>
  );
}
