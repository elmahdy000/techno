"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { decideVendor } from "@/lib/actions/admin-actions";
import { Button } from "@/components/ui/button";

export function VendorActionButtons({
  locale,
  vendorId,
  status,
}: {
  locale: string;
  vendorId: string;
  status: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: "APPROVE" | "REJECT" | "SUSPEND" | "REACTIVATE") {
    startTransition(async () => {
      try {
        await decideVendor(locale, { vendorId, action });
        toast.success(t.common.success);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t.common.error);
      }
    });
  }

  if (status === "PENDING") {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="success" disabled={pending} onClick={() => run("APPROVE")}>
          {t.common.confirm}
        </Button>
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => run("REJECT")}>
          {t.common.cancel}
        </Button>
      </div>
    );
  }
  if (status === "APPROVED") {
    return (
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => run("SUSPEND")}>
        Suspend
      </Button>
    );
  }
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => run("REACTIVATE")}>
      {t.common.save}
    </Button>
  );
}
