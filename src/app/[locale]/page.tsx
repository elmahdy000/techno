import Link from "next/link";
import { ArrowRight, Cpu, Laptop, Monitor, Package, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/i18n/get-dictionary";
import { link, pickL } from "@/lib/links";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { placeholderUrl } from "@/lib/store/image-store";
import type { Locale } from "@/i18n/config";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  laptops: Laptop,
  desktops: Monitor,
  components: Cpu,
  accessories: Package,
  "spare-parts": Wrench,
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const safeLocale: Locale = locale === "ar" ? "ar" : "en";

  const [categories, featured, featuredCount, vendorCount] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null, active: true },
      orderBy: { sortOrder: "asc" },
      take: 5,
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", featured: true },
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        variants: { select: { id: true, price: true, compareAtPrice: true, stock: true, active: true } },
      },
      orderBy: { soldCount: "desc" },
      take: 8,
    }),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.vendor.count({ where: { status: "APPROVED" } }),
  ]);

  const orderCount = await prisma.order.count();

  return (
    <div className="container pb-16">
      {/* Hero */}
      <section className="relative mt-6 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground">
        <div className="grid gap-6 p-8 sm:p-12 lg:grid-cols-2">
          <div className="space-y-5">
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              {t.hero.title}
            </h1>
            <p className="max-w-lg text-primary-foreground/85 sm:text-lg">
              {t.hero.subtitle}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary" size="lg">
                <Link href={link(locale, "/catalog")}>
                  {t.hero.ctaShop}
                  <ArrowRight className={locale === "ar" ? "rotate-180" : ""} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                <Link href={link(locale, "/category/components")}>{t.hero.ctaComponents}</Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 self-center">
            {[
              { value: vendorCount, label: t.hero.statsVendors },
              { value: featuredCount, label: t.hero.statsProducts },
              { value: orderCount, label: t.hero.statsOrders },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-primary-foreground/10 p-4 text-center backdrop-blur">
                <p className="text-2xl font-bold sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-xs text-primary-foreground/80 sm:text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mt-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t.category.heading}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.category.subheading}</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href={link(locale, "/catalog")}>
              {t.common.viewAll}
              <ArrowRight className={locale === "ar" ? "rotate-180" : ""} />
            </Link>
          </Button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => {
            const Icon = CATEGORY_ICONS[c.slug] ?? Package;
            return (
              <Link
                key={c.id}
                href={link(locale, `/category/${c.slug}`)}
                className="group flex flex-col items-center gap-3 rounded-xl border p-6 text-center transition-colors hover:border-primary hover:bg-accent/50"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <Icon className="h-7 w-7" />
                </span>
                <span className="font-semibold">{pickL(locale, c.name, c.nameAr)}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured products */}
      <section className="mt-14">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">{t.common.featured ?? "Featured"}</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href={link(locale, "/catalog")}>
              {t.common.viewAll}
              <ArrowRight className={locale === "ar" ? "rotate-180" : ""} />
            </Link>
          </Button>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              locale={locale}
            />
          ))}
        </div>
      </section>

      {/* Banner strip */}
      <section className="mt-14 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-muted/50 p-6">
          <h3 className="text-lg font-bold">{t.product.shippedByPlatform}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t.product.platformGuarantee}</p>
        </div>
        <div className="rounded-xl border bg-muted/50 p-6">
          <h3 className="text-lg font-bold">{t.auth.wantVendor}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t.vendor.becomeVendorPrompt}</p>
          <Button asChild size="sm" className="mt-3">
            <Link href={link(locale, "/auth/register")}>{t.auth.becomeVendor}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
