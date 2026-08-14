import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { checkPermission } from "@/lib/rbac";
import { getDictionary } from "@/i18n/get-dictionary";
import { link } from "@/lib/links";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({
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

  const isAdmin = await checkPermission(user, "analytics.view");
  if (!isAdmin) redirect(link(locale, "/"));

  return (
    <div className="container grid gap-4 py-6 lg:grid-cols-[240px_1fr] lg:gap-8 lg:py-8">
      <aside className="min-w-0">
        <div className="hidden rounded-lg border p-4 lg:block">
          <p className="font-semibold">{t.admin.dashboard}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <div className="lg:mt-4">
          <AdminNav />
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
