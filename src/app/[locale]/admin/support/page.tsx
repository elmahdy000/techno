import { getDictionary } from "@/i18n/get-dictionary";
import { prisma } from "@/lib/prisma";
import { link } from "@/lib/links";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Admin support" };

const STATUS_KEY: Record<string, string> = {
  OPEN: "statusOpen",
  IN_PROGRESS: "statusInProgress",
  WAITING_CUSTOMER: "statusWaitingCustomer",
  RESOLVED: "statusResolved",
  CLOSED: "statusClosed",
};

const PRIORITY_KEY: Record<string, string> = {
  LOW: "priorityLow",
  MEDIUM: "priorityMedium",
  HIGH: "priorityHigh",
};

const STATUS_VARIANT: Record<string, "secondary" | "success" | "destructive" | "outline" | "default"> = {
  OPEN: "secondary",
  IN_PROGRESS: "default",
  WAITING_CUSTOMER: "outline",
  RESOLVED: "success",
  CLOSED: "outline",
};

export default async function AdminSupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);

  const tickets = await prisma.supportTicket.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      user: { select: { name: true, email: true } },
      vendor: { select: { name: true } },
      _count: { select: { messages: true } },
    },
  });

  const openCount = tickets.filter((tk) => ["OPEN", "IN_PROGRESS"].includes(tk.status)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.admin.support}</h1>
        <p className="text-sm text-muted-foreground">
          {openCount} {t.support.statusOpen} · {tickets.length} {t.common.total}
        </p>
      </div>

      <div className="space-y-2">
        {tickets.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              {t.common.none}
            </CardContent>
          </Card>
        ) : (
          tickets.map((tk) => (
            <a key={tk.id} href={link(locale, `/admin/support/${tk.id}`)} className="block">
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{tk.subject}</p>
                      <Badge variant={STATUS_VARIANT[tk.status]}>
                        {t.support[STATUS_KEY[tk.status] as keyof typeof t.support] ?? tk.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      #{tk.ticketNumber} · {tk.user.name}
                      {tk.vendor ? ` · ${tk.vendor.name}` : ""} · {tk._count.messages} msgs ·{" "}
                      {new Date(tk.updatedAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs">
                    <Badge variant={tk.priority === "HIGH" ? "destructive" : tk.priority === "MEDIUM" ? "outline" : "secondary"}>
                      {t.support[PRIORITY_KEY[tk.priority] as keyof typeof t.support] ?? tk.priority}
                    </Badge>
                    <span className="text-muted-foreground">{tk.category}</span>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
