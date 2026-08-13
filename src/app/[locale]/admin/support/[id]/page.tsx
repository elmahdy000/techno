import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDictionary } from "@/i18n/get-dictionary";
import { prisma } from "@/lib/prisma";
import { link } from "@/lib/links";
import { AdminTicketReplyForm } from "@/components/admin/ticket-reply-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin support ticket" };

const STATUS_KEY: Record<string, string> = {
  OPEN: "statusOpen",
  IN_PROGRESS: "statusInProgress",
  WAITING_CUSTOMER: "statusWaitingCustomer",
  RESOLVED: "statusResolved",
  CLOSED: "statusClosed",
};

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = getDictionary(locale);

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      vendor: { select: { name: true } },
      messages: {
        include: { sender: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!ticket) notFound();

  const isAdminSender = (senderId: string, senderRole: string) =>
    senderRole === "ADMIN" || senderRole === "SUPER_ADMIN";

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={link(locale, "/admin/support")}
          className="text-sm text-muted-foreground hover:underline"
        >
          {t.admin.support}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">{ticket.subject}</h1>
          <Badge variant="secondary">
            {t.support[STATUS_KEY[ticket.status] as keyof typeof t.support] ?? ticket.status}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          #{ticket.ticketNumber} · {ticket.user.name} ({ticket.user.email}) · {ticket.category} ·{" "}
          {ticket.priority} ·{" "}
          {new Date(ticket.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          {ticket.messages.map((m) => {
            const fromAdmin = isAdminSender(m.senderId, m.senderRole);
            return (
              <div
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-lg border p-3",
                  fromAdmin ? "ms-auto bg-primary/5" : "me-auto bg-muted/40",
                )}
              >
                <p className="text-xs font-semibold">
                  {m.sender.name}
                  {m.senderRole !== "CUSTOMER" && (
                    <Badge variant="outline" className="ms-1 text-[9px]">
                      {m.senderRole}
                    </Badge>
                  )}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm">{m.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {ticket.status !== "CLOSED" && (
        <Card>
          <CardContent className="p-4">
            <AdminTicketReplyForm locale={locale} ticketId={ticket.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
