"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { link } from "@/lib/links";

const addressSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().min(2),
  phone: z.string().min(6),
  line1: z.string().min(3),
  line2: z.string().optional().or(z.literal("")),
  city: z.string().min(2),
  state: z.string().optional().or(z.literal("")),
  postalCode: z.string().optional().or(z.literal("")),
  country: z.string().min(2),
  isDefault: z.boolean().optional(),
});

export async function saveAddress(locale: string, input: z.infer<typeof addressSchema>) {
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));
  const parsed = addressSchema.parse(input);

  if (parsed.id) {
    const existing = await prisma.address.findFirst({
      where: { id: parsed.id, userId: user.id },
    });
    if (!existing) throw new Error("Address not found");
    if (parsed.isDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }
    await prisma.address.update({
      where: { id: parsed.id },
      data: {
        fullName: parsed.fullName,
        phone: parsed.phone,
        line1: parsed.line1,
        line2: parsed.line2 || null,
        city: parsed.city,
        state: parsed.state || null,
        postalCode: parsed.postalCode || null,
        country: parsed.country,
        isDefault: parsed.isDefault ?? existing.isDefault,
      },
    });
  } else {
    const count = await prisma.address.count({ where: { userId: user.id } });
    const isDefault = parsed.isDefault || count === 0;
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }
    await prisma.address.create({
      data: {
        userId: user.id,
        fullName: parsed.fullName,
        phone: parsed.phone,
        line1: parsed.line1,
        line2: parsed.line2 || null,
        city: parsed.city,
        state: parsed.state || null,
        postalCode: parsed.postalCode || null,
        country: parsed.country,
        isDefault,
      },
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteAddress(locale: string, id: string) {
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));
  const existing = await prisma.address.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("Address not found");
  await prisma.address.delete({ where: { id } });
  revalidatePath("/", "layout");
  return { ok: true };
}
