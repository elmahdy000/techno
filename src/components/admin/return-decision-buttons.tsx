"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { getErrorMessage } from "@/i18n/errors";
import { decideReturn } from "@/lib/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ReturnDecisionButtons({
  locale,
  returnRequestId,
}: {
  locale: string;
  returnRequestId: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");

  function run(action: "APPROVE" | "REJECT") {
    startTransition(async () => {
      try {
        await decideReturn(locale, { returnRequestId, action, note });
        toast.success(t.common.success);
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, t));
      }
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        rows={1}
        placeholder={t.common.description}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="min-h-8 text-xs"
      />
      <div className="flex gap-2">
        <Button size="sm" variant="success" disabled={pending} onClick={() => run("APPROVE")}>
          {t.admin.approve}
        </Button>
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => run("REJECT")}>
          {t.admin.reject}
        </Button>
      </div>
    </div>
  );
}
