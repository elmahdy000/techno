"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { moderateReview } from "@/lib/actions/admin-actions";
import { Button } from "@/components/ui/button";

export function ReviewModerationButtons({
  locale,
  reviewId,
  status,
}: {
  locale: string;
  reviewId: string;
  status: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: "PUBLISH" | "REJECT") {
    startTransition(async () => {
      try {
        await moderateReview(locale, { reviewId, action });
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
        <Button size="sm" variant="success" disabled={pending} onClick={() => run("PUBLISH")}>
          {t.common.confirm}
        </Button>
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => run("REJECT")}>
          {t.common.cancel}
        </Button>
      </div>
    );
  }
  if (status === "REJECTED") {
    return (
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run("PUBLISH")}>
        {t.common.confirm}
      </Button>
    );
  }
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => run("REJECT")}>
      Reject
    </Button>
  );
}
