import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  return user;
});

export const getCurrentVendor = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const vendor = await prisma.vendor.findUnique({
    where: { userId: user.id },
    include: { wallet: true },
  });
  return vendor;
});
