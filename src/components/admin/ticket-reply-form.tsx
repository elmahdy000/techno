"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { replyTicket } from "@/lib/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"] as const;

export function AdminTicketReplyForm({ locale, ticketId }: { locale: string; ticketId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string>("IN_PROGRESS");

  function submit() {
    if (body.trim().length < 2) return;
    startTransition(async () => {
      try {
        await replyTicket(locale, {
          ticketId,
          body,
          status: status as (typeof STATUS_OPTIONS)[number],
        });
        setBody("");
        toast.success(t.common.success);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t.common.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder={t.support.message}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={submit} disabled={pending || body.trim().length < 2} className="shrink-0">
          {t.support.send}
        </Button>
      </div>
    </div>
  );
}
