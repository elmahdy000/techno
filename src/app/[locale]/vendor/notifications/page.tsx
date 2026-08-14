import { CheckCheck } from "lucide-react";
import { getDictionary, pageTitle } from "@/i18n/get-dictionary";
import { getCurrentVendor } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { markVendorNotificationsRead } from "@/lib/actions/vendor-actions";
import { link } from "@/lib/links";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return { title: pageTitle(locale, "vendorNotifications") };
}

export default async function VendorNotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const vendor = await getCurrentVendor();
  if (!vendor) return null;

  const notifications = await prisma.notification.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.vendor.notifications}</h1>
        {unread > 0 && (
          <form action={markVendorNotificationsRead.bind(null, locale)}>
            <Button variant="outline" size="sm">
              <CheckCheck className="h-4 w-4" />
              {t.account.markAllRead}
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {t.account.noNotifications}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {notifications.map((n) => {
          const content = (
            <div
              className={`rounded-lg border p-4 ${n.readAt ? "" : "border-primary/40 bg-primary/5"}`}
            >
              <p className="text-sm font-semibold">{n.title}</p>
              {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(n.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}
              </p>
            </div>
          );
          return n.link ? (
            <a key={n.id} href={link(locale, n.link)} className="block">
              {content}
            </a>
          ) : (
            <div key={n.id}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
