"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Truck } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { getErrorMessage } from "@/i18n/errors";
import { shipShipment, deliverShipment } from "@/lib/actions/vendor-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ShipDialog({
  locale,
  shipmentId,
}: {
  locale: string;
  shipmentId: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");

  function submit() {
    if (carrier.trim().length < 2 || tracking.trim().length < 3) {
      toast.error(t.common.error);
      return;
    }
    startTransition(async () => {
      try {
        await shipShipment(locale, { shipmentId, carrier, trackingNumber: tracking });
        toast.success(t.common.success);
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, t));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Truck className="h-3.5 w-3.5" />
          {t.vendor.fulfillShipment}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.vendor.fulfillShipment}</DialogTitle>
          <DialogDescription>{t.order.tracking}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t.common.name}</Label>
            <Input
              dir="ltr"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder={t.vendor.carrierPlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Label>{t.order.tracking}</Label>
            <Input
              dir="ltr"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder={t.vendor.trackingPlaceholder}
            />
          </div>
          <Button className="w-full" disabled={pending} onClick={submit}>
            {t.common.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DeliverButton({
  locale,
  shipmentId,
}: {
  locale: string;
  shipmentId: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="success"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await deliverShipment(locale, shipmentId);
            toast.success(t.vendor.markDelivered);
            router.refresh();
          } catch (err) {
            toast.error(getErrorMessage(err, t));
          }
        })
      }
    >
      {t.vendor.markDelivered}
    </Button>
  );
}
