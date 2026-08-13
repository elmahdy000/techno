import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getDictionary } from "@/i18n/get-dictionary";
import { link } from "@/lib/links";
import { AccountNav } from "@/components/account/account-nav";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) redirect(link(locale, "/auth/login"));

  return (
    <div className="container grid gap-8 py-8 lg:grid-cols-[240px_1fr]">
      <aside>
        <div className="rounded-lg border p-4">
          <p className="font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t.account.memberSince}:{" "}
            {new Date(user.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="mt-4">
          <AccountNav />
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
