"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { createTicket } from "@/lib/actions/order-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CATEGORIES = [
  "catOrder",
  "catPayment",
  "catReturn",
  "catProduct",
  "catAccount",
  "catVendor",
  "catOther",
] as const;

export function NewTicketDialog({ locale }: { locale: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<string>("ORDER");
  const [message, setMessage] = useState("");

  function submit() {
    if (subject.trim().length < 3 || message.trim().length < 10) {
      toast.error(t.common.error);
      return;
    }
    startTransition(async () => {
      try {
        await createTicket(locale, { subject, category: category as never, message });
        toast.success(t.support.ticketCreated);
        setOpen(false);
        setSubject("");
        setMessage("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t.common.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t.support.newTicket}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.support.openTicket}</DialogTitle>
          <DialogDescription>{t.support.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t.support.subject}</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t.support.category}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c.replace("cat", "").toUpperCase()}>
                    {t.support[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t.support.message}</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
          </div>
          <Button className="w-full" disabled={pending} onClick={submit}>
            {t.support.send}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
