import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TicketReplyForm } from "@/components/support/ticket-reply-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Support ticket" };

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) return null;

  const ticket = await prisma.supportTicket.findFirst({
    where: { id, userId: user.id },
    include: {
      messages: {
        include: { sender: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!ticket) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{ticket.subject}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          #{ticket.ticketNumber} ·{" "}
          {new Date(ticket.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          {ticket.messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[85%] rounded-lg border p-3",
                m.senderId === user.id
                  ? "ms-auto bg-primary/5"
                  : "me-auto bg-muted/40",
              )}
            >
              <p className="text-xs font-semibold">{m.sender.name}</p>
              <p className="mt-1 whitespace-pre-line text-sm">{m.body}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {new Date(m.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {ticket.status !== "CLOSED" && (
        <TicketReplyForm locale={locale} ticketId={ticket.id} />
      )}
    </div>
  );
}
