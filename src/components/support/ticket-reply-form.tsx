"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { replyToTicket } from "@/lib/actions/order-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function TicketReplyForm({ locale, ticketId }: { locale: string; ticketId: string }) {
  const { t } = useI18n();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (body.trim().length < 3) return;
    startTransition(async () => {
      try {
        await replyToTicket(locale, ticketId, body);
        setBody("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t.common.error);
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder={t.support.message} />
      <Button onClick={submit} disabled={pending || body.trim().length < 3} className="shrink-0">
        {t.support.send}
      </Button>
    </div>
  );
}
