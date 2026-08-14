import type { Metadata } from "next";
import { getDictionary, pageTitle } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/session";
import { ProfileForm } from "@/components/account/profile-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: pageTitle(locale, "accountSettings") };
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.account.settings}</h1>
      <ProfileForm locale={locale} name={user.name} phone={user.phone ?? ""} />
    </div>
  );
}
