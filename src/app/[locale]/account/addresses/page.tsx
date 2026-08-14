import type { Metadata } from "next";
import { getDictionary, pageTitle } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AddressFormDialog } from "@/components/checkout/address-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: pageTitle(locale, "accountAddresses") };
}

export default async function AddressesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) return null;

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.account.addresses}</h1>
        <AddressFormDialog
          locale={locale}
          trigger={<Button size="sm">{t.checkout.newAddress}</Button>}
        />
      </div>

      {addresses.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {t.checkout.selectAddress}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {addresses.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4 text-sm">
              <div className="flex items-start justify-between">
                <p className="font-medium">{a.fullName}</p>
                {a.isDefault && <Badge variant="success">{t.common.default}</Badge>}
              </div>
              <p className="mt-1 text-muted-foreground">{a.line1}</p>
              {a.line2 && <p className="text-muted-foreground">{a.line2}</p>}
              <p className="text-muted-foreground">
                {a.city}
                {a.state ? `, ${a.state}` : ""} · {a.country}
                {a.postalCode ? ` · ${a.postalCode}` : ""}
              </p>
              <p className="mt-1 text-muted-foreground">{a.phone}</p>
              <div className="mt-3">
                <AddressFormDialog
                  locale={locale}
                  address={{
                    id: a.id,
                    fullName: a.fullName,
                    phone: a.phone,
                    line1: a.line1,
                    line2: a.line2,
                    city: a.city,
                    state: a.state,
                    country: a.country,
                    postalCode: a.postalCode,
                    isDefault: a.isDefault,
                  }}
                  trigger={<Button variant="outline" size="sm">{t.common.edit}</Button>}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
