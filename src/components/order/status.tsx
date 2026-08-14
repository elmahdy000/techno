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

const SHIPPING_STATUS_LABEL: Record<ShippingStatus, keyof Dictionary["order"]> = {
  PENDING: "statusPending",
  PICKED: "statusPicked",
  SHIPPED: "statusShipped",
  DELIVERED: "statusDelivered",
};

export function shippingStatusLabel(status: ShippingStatus, t: Dictionary) {
  return t.order[SHIPPING_STATUS_LABEL[status]] ?? status;
}

const VENDOR_STATUS_LABEL: Record<string, keyof Dictionary["vendor"]> = {
  PENDING: "statusPending",
  APPROVED: "statusApproved",
  SUSPENDED: "statusSuspended",
  REJECTED: "statusRejected",
};

export function vendorStatusLabel(status: string, t: Dictionary) {
  return VENDOR_STATUS_LABEL[status]
    ? t.vendor[VENDOR_STATUS_LABEL[status]]
    : status;
}

const WITHDRAWAL_STATUS_LABEL: Record<string, keyof Dictionary["vendor"]> = {
  PENDING: "withdrawalPending",
  APPROVED: "withdrawalApproved",
  PROCESSING: "withdrawalProcessing",
  PAID: "withdrawalPaid",
  REJECTED: "withdrawalRejected",
  CANCELLED: "withdrawalCancelled",
};

export function withdrawalStatusLabel(status: string, t: Dictionary) {
  return WITHDRAWAL_STATUS_LABEL[status]
    ? t.vendor[WITHDRAWAL_STATUS_LABEL[status]]
    : status;
}

const PRODUCT_STATUS_LABEL: Record<string, keyof Dictionary["vendor"]> = {
  DRAFT: "productStatusDraft",
  ACTIVE: "productStatusActive",
  INACTIVE: "productStatusInactive",
  ARCHIVED: "productStatusArchived",
};

export function productStatusLabel(status: string, t: Dictionary) {
  return PRODUCT_STATUS_LABEL[status]
    ? t.vendor[PRODUCT_STATUS_LABEL[status]]
    : status;
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
