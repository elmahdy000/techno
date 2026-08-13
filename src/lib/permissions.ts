import type { Role } from "@prisma/client";

export type PermissionCode =
  | "product.manage"
  | "product.analytics.view"
  | "order.manage"
  | "order.admin_manage"
  | "review.respond"
  | "review.moderate"
  | "wallet.view"
  | "wallet.withdraw"
  | "ledger.view"
  | "commission.view"
  | "commission.manage"
  | "users.manage"
  | "vendors.manage"
  | "withdrawals.manage"
  | "support.manage"
  | "catalog.manage"
  | "analytics.view"
  | "settings.manage";

export const PERMISSION_DEFS: Record<
  PermissionCode,
  { name: string; group: string; description: string }
> = {
  "product.manage": {
    name: "Manage Products",
    group: "Catalog",
    description: "Create, update and publish own products, variants and inventory",
  },
  "product.analytics.view": {
    name: "View Product Analytics",
    group: "Analytics",
    description: "View performance analytics for own products",
  },
  "order.manage": {
    name: "Manage Orders",
    group: "Orders",
    description: "Manage fulfillment, shipping and order status for own orders",
  },
  "order.admin_manage": {
    name: "Admin Orders",
    group: "Orders",
    description: "Full order administration across all vendors",
  },
  "review.respond": {
    name: "Respond to Reviews",
    group: "Reviews",
    description: "Reply to product reviews for own products",
  },
  "review.moderate": {
    name: "Moderate Reviews",
    group: "Reviews",
    description: "Approve or reject customer reviews platform-wide",
  },
  "wallet.view": {
    name: "View Wallet",
    group: "Wallet",
    description: "View wallet balance and balances breakdown",
  },
  "wallet.withdraw": {
    name: "Request Withdrawals",
    group: "Wallet",
    description: "Request payouts from wallet balance",
  },
  "ledger.view": {
    name: "View Ledger",
    group: "Wallet",
    description: "View full financial ledger history",
  },
  "commission.view": {
    name: "View Commission",
    group: "Wallet",
    description: "View commission rates and breakdowns",
  },
  "commission.manage": {
    name: "Manage Commission",
    group: "Administration",
    description: "Configure platform commission rates",
  },
  "users.manage": {
    name: "Manage Users",
    group: "Administration",
    description: "Manage customer and vendor user accounts",
  },
  "vendors.manage": {
    name: "Manage Vendors",
    group: "Administration",
    description: "Approve, suspend and manage vendor accounts",
  },
  "withdrawals.manage": {
    name: "Manage Withdrawals",
    group: "Administration",
    description: "Approve, reject and process vendor withdrawals",
  },
  "support.manage": {
    name: "Manage Support",
    group: "Administration",
    description: "Manage support tickets and resolve issues",
  },
  "catalog.manage": {
    name: "Manage Catalog",
    group: "Administration",
    description: "Manage categories and specification attributes",
  },
  "analytics.view": {
    name: "View Analytics",
    group: "Analytics",
    description: "View platform-wide analytics",
  },
  "settings.manage": {
    name: "Manage Settings",
    group: "Administration",
    description: "Manage platform configuration and settings",
  },
};

export const ROLE_PERMISSIONS: Record<Role, PermissionCode[]> = {
  CUSTOMER: [],
  VENDOR: [
    "product.manage",
    "product.analytics.view",
    "order.manage",
    "review.respond",
    "wallet.view",
    "wallet.withdraw",
    "ledger.view",
    "commission.view",
  ],
  ADMIN: [
    "product.manage",
    "product.analytics.view",
    "order.manage",
    "order.admin_manage",
    "review.respond",
    "review.moderate",
    "wallet.view",
    "wallet.withdraw",
    "ledger.view",
    "commission.view",
    "commission.manage",
    "users.manage",
    "vendors.manage",
    "withdrawals.manage",
    "support.manage",
    "catalog.manage",
    "analytics.view",
    "settings.manage",
  ],
  SUPER_ADMIN: Object.keys(PERMISSION_DEFS) as PermissionCode[],
};

export const ALL_ROLES: Role[] = ["CUSTOMER", "VENDOR", "ADMIN", "SUPER_ADMIN"];
