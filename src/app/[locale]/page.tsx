import Link from "next/link";
import { ArrowRight, Cpu, Laptop, Monitor, Package, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/i18n/get-dictionary";
import { link, pickL } from "@/lib/links";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";

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

  const [categories, featured, featuredCount, vendorCount, orderCount] = await Promise.all([
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
    prisma.order.count(),
  ]);

  return (
    <div className="container pb-16">
      {/* Hero */}
      <section className="relative mt-4 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rtl:bg-gradient-to-l sm:mt-6">
        <div className="grid gap-6 p-6 sm:p-12 lg:grid-cols-2">
          <div className="space-y-4 sm:space-y-5">
            <h1 className="text-2xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              {t.hero.title}
            </h1>
            <p className="max-w-lg text-primary-foreground/85 text-sm sm:text-lg">
              {t.hero.subtitle}
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Button asChild variant="secondary" size="lg">
                <Link href={link(locale, "/catalog")}>
                  {t.hero.ctaShop}
                  <ArrowRight className="rtl:rotate-180" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                <Link href={link(locale, "/category/components")}>{t.hero.ctaComponents}</Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 self-center sm:gap-3">
            {[
              { value: vendorCount, label: t.hero.statsVendors },
              { value: featuredCount, label: t.hero.statsProducts },
              { value: orderCount, label: t.hero.statsOrders },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-primary-foreground/10 p-2.5 text-center backdrop-blur sm:p-4">
                <p className="text-xl font-bold sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-[10px] text-primary-foreground/80 sm:text-sm">{s.label}</p>
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
              <ArrowRight className="rtl:rotate-180" />
            </Link>
          </Button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {categories.map((c) => {
            const Icon = CATEGORY_ICONS[c.slug] ?? Package;
            return (
              <Link
                key={c.id}
                href={link(locale, `/category/${c.slug}`)}
                className="group flex flex-col items-center gap-3 rounded-xl border p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-lg sm:p-6"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground sm:h-14 sm:w-14">
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                </span>
                <span className="text-sm font-semibold sm:text-base">{pickL(locale, c.name, c.nameAr)}</span>
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
              <ArrowRight className="rtl:rotate-180" />
            </Link>
          </Button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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
        <div className="rounded-xl border bg-muted/50 p-5 sm:p-6">
          <h3 className="text-base font-bold sm:text-lg">{t.product.shippedByPlatform}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t.product.platformGuarantee}</p>
        </div>
        <div className="rounded-xl border bg-muted/50 p-5 sm:p-6">
          <h3 className="text-base font-bold sm:text-lg">{t.auth.wantVendor}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t.vendor.becomeVendorPrompt}</p>
          <Button asChild size="sm" className="mt-3">
            <Link href={link(locale, "/auth/register")}>{t.auth.becomeVendor}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
