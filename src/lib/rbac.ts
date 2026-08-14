import { cache } from "react";
import type { Role, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PERMISSION_DEFS, type PermissionCode } from "@/lib/permissions";

export const getRolePermissions = cache(async (
  role: Role,
): Promise<Set<PermissionCode>> => {
  if (role === "SUPER_ADMIN") {
    return new Set(Object.keys(PERMISSION_DEFS) as PermissionCode[]);
  }

  const rows = await prisma.rolePermission.findMany({
    where: { role },
    select: { permission: { select: { code: true } } },
  });
  return new Set(
    rows
      .map((r) => r.permission.code as PermissionCode)
      .filter((c) => c in PERMISSION_DEFS),
  );
});

export async function hasPermission(
  user: Pick<User, "role"> | null | undefined,
  permission: PermissionCode,
): Promise<boolean> {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  const perms = await getRolePermissions(user.role);
  return perms.has(permission);
}

export async function hasAnyPermission(
  user: Pick<User, "role"> | null | undefined,
  permissions: PermissionCode[],
): Promise<boolean> {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  const perms = await getRolePermissions(user.role);
  return permissions.some((p) => perms.has(p));
}

// Memoized per-request helper for server components
export const checkPermission = cache(
  async (user: Pick<User, "role"> | null | undefined, code: PermissionCode) =>
    hasPermission(user, code),
);

export function roleLabel(role: Role): string {
  switch (role) {
    case "CUSTOMER":
      return "Customer";
    case "VENDOR":
      return "Vendor";
    case "ADMIN":
      return "Administrator";
    case "SUPER_ADMIN":
      return "Super Admin";
  }
}
