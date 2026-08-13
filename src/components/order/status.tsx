import type { OrderStatus, ShippingStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import type { Dictionary } from "@/i18n/dictionaries/en";

const ORDER_STATUS_VARIANT: Record<OrderStatus, "secondary" | "success" | "destructive" | "default" | "outline"> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  PROCESSING: "default",
  SHIPPED: "outline",
  PARTIALLY_SHIPPED: "outline",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

export function statusBadge(status: OrderStatus, t: Dictionary, size?: "sm" | "md") {
  const key = `status${status.charAt(0)}${status.slice(1).toLowerCase()}` as
    | "statusPending"
    | "statusConfirmed"
    | "statusProcessing"
    | "statusShipped"
    | "statusPartiallyShipped"
    | "statusDelivered"
    | "statusCancelled";
  return (
    <Badge variant={ORDER_STATUS_VARIANT[status]} className={size === "sm" ? "text-[10px]" : ""}>
      {t.order[key]}
    </Badge>
  );
}

export function payStatusLabel(status: string, t: Dictionary) {
  const map: Record<string, string> = {
    UNPAID: t.order.payPending,
    PAID: t.order.payPaid,
    REFUNDED: t.order.payRefunded,
    PARTIALLY_REFUNDED: t.order.payPartiallyRefunded,
  };
  return map[status] ?? status;
}
