"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { signIn } from "@/lib/auth";
import { link } from "@/lib/links";
import { slugify, generateUniqueSuffix } from "@/lib/utils";

const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional().or(z.literal("")),
  becomeVendor: z.boolean().optional(),
});

export async function registerUser(locale: string, input: z.infer<typeof registerSchema>) {
  const parsed = registerSchema.parse(input);
  const email = parsed.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "registerError" };
  }

  const passwordHash = await bcrypt.hash(parsed.password, 10);
  const role = parsed.becomeVendor ? "VENDOR" : "CUSTOMER";

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: parsed.name,
        email,
        passwordHash,
        phone: parsed.phone || null,
        role: role as "CUSTOMER" | "VENDOR",
        emailVerified: new Date(),
      },
    });
  } catch (err) {
    // Unique email race: another request created the account first
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return { ok: false, error: "registerError" };
    }
    throw err;
  }

  if (parsed.becomeVendor) {
    await prisma.vendor.create({
      data: {
        userId: user.id,
        name: `${parsed.name}'s Store`,
        slug: `${slugify(parsed.name)}-store-${generateUniqueSuffix()}`,
        email,
        phone: parsed.phone || null,
        status: "PENDING",
      },
    });
  }

  await signIn("credentials", { email, password: parsed.password, redirect: false });
  revalidatePath("/", "layout");
  redirect(link(locale, parsed.becomeVendor ? "/vendor" : "/account"));
}

export async function becomeVendor(locale: string) {
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));

  if (user.role === "VENDOR" || user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    redirect(link(locale, "/vendor"));
  }

  const existingVendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
  if (existingVendor) {
    redirect(link(locale, "/vendor"));
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { role: "VENDOR" },
    }),
    prisma.vendor.create({
      data: {
        userId: user.id,
        name: `${user.name}'s Store`,
        slug: `${slugify(user.name)}-store-${generateUniqueSuffix()}`,
        email: user.email,
        status: "PENDING",
      },
    }),
  ]);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateProfile(locale: string, input: { name: string; phone: string }) {
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));

  const schema = z.object({
    name: z.string().min(2),
    phone: z.string().optional().or(z.literal("")),
  });
  const parsed = schema.parse(input);

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.name, phone: parsed.phone || null },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markAllNotificationsRead(
  locale: string,
  _formData?: FormData,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
}
