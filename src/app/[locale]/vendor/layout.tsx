import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentVendor } from "@/lib/session";
import { getDictionary } from "@/i18n/get-dictionary";
import { link } from "@/lib/links";
import { VendorNav } from "@/components/vendor/vendor-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function VendorLayout({
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

  const vendor = await getCurrentVendor();
  if (!vendor) {
    return (
      <div className="container py-16">
        <div className="mx-auto max-w-md rounded-lg border p-8 text-center">
          <h1 className="text-xl font-bold">{t.vendor.needVendorAccount}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t.vendor.becomeVendorPrompt}</p>
          <Button asChild className="mt-6">
            <a href={link(locale, "/auth/register")}>{t.vendor.requestVendorAccount}</a>
          </Button>
        </div>
      </div>
    );
  }

  if (vendor.status === "PENDING") {
    return (
      <div className="container py-16">
        <div className="mx-auto max-w-md rounded-lg border p-8 text-center">
          <h1 className="text-xl font-bold">{t.vendor.notApproved}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t.vendor.vendorRequested}</p>
        </div>
      </div>
    );
  }

  if (vendor.status === "SUSPENDED" || vendor.status === "REJECTED") {
    return (
      <div className="container py-16">
        <div className="mx-auto max-w-md rounded-lg border p-8 text-center">
          <h1 className="text-xl font-bold">{t.vendor.suspended}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container grid gap-8 py-8 lg:grid-cols-[240px_1fr]">
      <aside>
        <div className="rounded-lg border p-4">
          <p className="font-semibold">{vendor.name}</p>
          <div className="mt-2">
            <Badge variant="success">{t.vendor.statusApproved}</Badge>
          </div>
        </div>
        <div className="mt-4">
          <VendorNav />
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
