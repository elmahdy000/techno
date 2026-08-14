"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Pencil, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { getErrorMessage } from "@/i18n/errors";
import { placeOrder } from "@/lib/actions/checkout-actions";
import { deleteAddress } from "@/lib/actions/address-actions";
import { formatMoneyClient } from "@/lib/client-money";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AddressFormDialog, type AddressData } from "@/components/checkout/address-form-dialog";

export type CheckoutLine = {
  productSlug: string;
  productName: string;
  variantName: string;
  quantity: number;
  imageUrl: string | null;
  price: number;
};

export function CheckoutForm({
  locale,
  addresses,
  lines,
  totals,
}: {
  locale: string;
  addresses: AddressData[];
  lines: CheckoutLine[];
  totals: { subtotal: number; shippingFee: number; taxAmount: number; total: number };
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [selectedAddress, setSelectedAddress] = useState(
    () => addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "",
  );
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "COD">("CARD");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function place() {
    if (!selectedAddress) {
      toast.error(t.checkout.selectAddress);
      return;
    }
    startTransition(async () => {
      try {
        await placeOrder(locale, { addressId: selectedAddress, paymentMethod, note });
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, t));
      }
    });
  }

  function removeAddress(id: string) {
    startTransition(async () => {
      try {
        await deleteAddress(locale, id);
        if (selectedAddress === id) {
          const rest = addresses.filter((a) => a.id !== id);
          setSelectedAddress(rest[0]?.id ?? "");
        }
        router.refresh();
      } catch (err) {
        toast.error(getErrorMessage(err, t));
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {/* Address */}
        <section className="rounded-lg border p-5">
          <h2 className="mb-4 font-bold">{t.checkout.shippingAddress}</h2>
          {addresses.length === 0 && (
            <p className="mb-3 text-sm text-muted-foreground">{t.checkout.selectAddress}</p>
          )}
          <div className="space-y-2" role="radiogroup" aria-label={t.checkout.shippingAddress}>
            {addresses.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  selectedAddress === a.id && "border-primary bg-primary/5",
                )}
              >
                <input
                  type="radio"
                  name="address"
                  checked={selectedAddress === a.id}
                  onChange={() => setSelectedAddress(a.id)}
                  className="mt-1"
                />
                <button
                  type="button"
                  onClick={() => setSelectedAddress(a.id)}
                  className="flex flex-1 cursor-pointer text-start text-sm"
                >
                  <span>
                    <span className="block font-medium">
                      {a.fullName} · {a.phone}
                      {a.isDefault && (
                        <span className="ms-2 text-xs text-primary">{t.common.default}</span>
                      )}
                    </span>
                    <span className="block text-muted-foreground">
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}
                    </span>
                    <span className="block text-muted-foreground">
                      {a.city}
                      {a.state ? `, ${a.state}` : ""} · {a.country} {a.postalCode}
                    </span>
                  </span>
                </button>
                <div className="flex items-center gap-1">
                  <AddressFormDialog
                    locale={locale}
                    address={a}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t.checkout.editAddress}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                  <button
                    type="button"
                    onClick={() => removeAddress(a.id)}
                    aria-label={t.common.delete}
                    title={t.common.delete}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <AddressFormDialog
              locale={locale}
              trigger={<Button variant="outline" size="sm">{t.checkout.newAddress}</Button>}
            />
          </div>
        </section>

        {/* Payment */}
        <section className="rounded-lg border p-5">
          <h2 className="mb-4 font-bold">{t.checkout.payment}</h2>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t.checkout.payment}>
            <button
              type="button"
              role="radio"
              aria-checked={paymentMethod === "CARD"}
              onClick={() => setPaymentMethod("CARD")}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-4 text-start transition-colors",
                paymentMethod === "CARD" && "border-primary bg-primary/5",
              )}
            >
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t.checkout.card}</p>
              </div>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={paymentMethod === "COD"}
              onClick={() => setPaymentMethod("COD")}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-4 text-start transition-colors",
                paymentMethod === "COD" && "border-primary bg-primary/5",
              )}
            >
              <Truck className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t.checkout.cod}</p>
              </div>
            </button>
          </div>
        </section>

        <section className="rounded-lg border p-5">
          <h2 className="mb-3 font-bold">{t.checkout.orderNote}</h2>
          <label htmlFor="order-note" className="sr-only">{t.checkout.orderNote}</label>
          <Textarea id="order-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        </section>
      </div>

      <aside className="h-fit rounded-lg border p-5 lg:sticky lg:top-20">
        <h2 className="font-bold">{t.checkout.summary}</h2>
        <div className="mt-3 max-h-56 space-y-2 overflow-auto pe-1">
          {lines.map((l, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                {l.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.imageUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-xs">{l.productName}</p>
                <p className="text-xs text-muted-foreground">{l.variantName} × {l.quantity}</p>
              </div>
              <span className="text-xs font-medium">{formatMoneyClient(l.price * l.quantity, locale)}</span>
            </div>
          ))}
        </div>
        <Separator className="my-4" />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.common.subtotal}</span>
            <span>{formatMoneyClient(totals.subtotal, locale)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.common.shipping}</span>
            <span>{totals.shippingFee === 0 ? t.common.free : formatMoneyClient(totals.shippingFee, locale)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.common.tax}</span>
            <span>{formatMoneyClient(totals.taxAmount, locale)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-base font-bold">
            <span>{t.common.total}</span>
            <span>{formatMoneyClient(totals.total, locale)}</span>
          </div>
        </div>
        {!selectedAddress ? (
          <AddressFormDialog
            locale={locale}
            trigger={
              <Button size="lg" className="mt-5 w-full" variant="outline">
                {t.checkout.newAddress}
              </Button>
            }
          />
        ) : (
          <Button size="lg" className="mt-5 w-full" disabled={pending} onClick={place}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.checkout.placeOrder}
          </Button>
        )}
      </aside>
    </div>
  );
}
