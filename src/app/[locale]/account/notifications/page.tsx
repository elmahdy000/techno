import type { Metadata } from "next";
import { CheckCheck } from "lucide-react";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { markAllNotificationsRead } from "@/lib/actions/auth-actions";
import { link } from "@/lib/links";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) return null;

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.account.notifications}</h1>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead.bind(null, locale)}>
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{n.title}</p>
                  {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                </div>
                {!n.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </div>
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
