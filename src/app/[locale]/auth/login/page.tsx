import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, pageTitle } from "@/i18n/get-dictionary";
import { link } from "@/lib/links";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: pageTitle(locale, "login") };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);

  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t.auth.loginTitle}</CardTitle>
            <CardDescription>{t.auth.loginSubtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground">
          {t.auth.noAccount}{" "}
          <Link href={link(locale, "/auth/register")} className="font-medium text-primary hover:underline">
            {t.auth.createOne}
          </Link>
        </p>
        <div className="rounded-lg border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">{t.admin.demoAccounts}</p>
          <p>{t.admin.demoCustomer}</p>
          <p>{t.admin.demoVendor}</p>
          <p>{t.admin.demoAdmin}</p>
        </div>
      </div>
    </div>
  );
}
