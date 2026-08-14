import type { Metadata } from "next";
import { getDictionary, pageTitle } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { link } from "@/lib/links";
import { NewTicketDialog } from "@/components/support/new-ticket-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: pageTitle(locale, "accountSupport") };
}

const STATUS_KEY: Record<string, string> = {
  OPEN: "statusOpen",
  IN_PROGRESS: "statusInProgress",
  WAITING_CUSTOMER: "statusWaitingCustomer",
  RESOLVED: "statusResolved",
  CLOSED: "statusClosed",
};

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) return null;

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.id },
    include: { _count: { select: { messages: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.support.title}</h1>
        <NewTicketDialog locale={locale} />
      </div>

      {tickets.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground">{t.account.noTickets}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {tickets.map((tk) => (
          <a key={tk.id} href={link(locale, `/account/support/${tk.id}`)} className="block">
            <Card className="transition-colors hover:border-primary/50">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{tk.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    #{tk.ticketNumber} · {tk._count.messages} msgs ·{" "}
                    {new Date(tk.updatedAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
                  </p>
                </div>
                <Badge variant="secondary">
                  {t.support[STATUS_KEY[tk.status] as keyof typeof t.support] ?? tk.status}
                </Badge>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
