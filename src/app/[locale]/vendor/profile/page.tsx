import { getDictionary } from "@/i18n/get-dictionary";
import { getCurrentVendor } from "@/lib/session";
import { VendorProfileForm } from "@/components/vendor/profile-form";

export const metadata = { title: "Store profile" };

export default async function VendorProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const vendor = await getCurrentVendor();
  if (!vendor) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.vendor.profile}</h1>
      </div>
      <VendorProfileForm
        locale={locale}
        initial={{
          name: vendor.name,
          description: vendor.description ?? "",
          email: vendor.email ?? "",
          phone: vendor.phone ?? "",
          logo: vendor.logo ?? "",
          cover: vendor.cover ?? "",
        }}
      />
    </div>
  );
}
