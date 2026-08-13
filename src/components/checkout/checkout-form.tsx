"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Pencil, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
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
        toast.error(err instanceof Error ? err.message : t.common.error);
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
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t.common.error);
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
          <div className="space-y-2">
            {addresses.map((a) => (
              <label
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
                <div className="flex-1 text-sm">
                  <p className="font-medium">
                    {a.fullName} · {a.phone}
                    {a.isDefault && (
                      <span className="ms-2 text-xs text-primary">Default</span>
                    )}
                  </p>
                  <p className="text-muted-foreground">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    {a.city}
                    {a.state ? `, ${a.state}` : ""} · {a.country} {a.postalCode}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <AddressFormDialog
                    locale={locale}
                    address={a}
                    trigger={
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                        <Pencil className="h-3.5 w-3.5" />
                      </span>
                    }
                  />
                  <button
                    type="button"
                    onClick={() => removeAddress(a.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </label>
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
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
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
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        </section>
      </div>

      <aside className="h-fit rounded-lg border p-5 lg:sticky lg:top-20">
        <h2 className="font-bold">{t.checkout.summary}</h2>
        <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
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
              <span className="text-xs font-medium">{formatMoneyClient(l.price * l.quantity)}</span>
            </div>
          ))}
        </div>
        <Separator className="my-4" />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.common.subtotal}</span>
            <span>{formatMoneyClient(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.common.shipping}</span>
            <span>{totals.shippingFee === 0 ? t.common.free : formatMoneyClient(totals.shippingFee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.common.tax}</span>
            <span>{formatMoneyClient(totals.taxAmount)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-base font-bold">
            <span>{t.common.total}</span>
            <span>{formatMoneyClient(totals.total)}</span>
          </div>
        </div>
        <Button size="lg" className="mt-5 w-full" disabled={pending || !selectedAddress} onClick={place}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t.checkout.placeOrder}
        </Button>
      </aside>
    </div>
  );
}
