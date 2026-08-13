import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/i18n/get-dictionary";
import { link } from "@/lib/links";
import type { Locale } from "@/i18n/config";

export async function Footer({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const categories = await prisma.category.findMany({
    where: { parentId: null, active: true },
    orderBy: { sortOrder: "asc" },
    take: 6,
  });

  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t bg-muted/40">
      <div className="container grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              TM
            </span>
            <span>{t.brand.name}</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{t.footer.aboutText}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">{t.footer.categories}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={link(locale, `/category/${c.slug}`)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {locale === "ar" && c.nameAr ? c.nameAr : c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">{t.footer.help}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href={link(locale, "/support")} className="text-muted-foreground hover:text-foreground">
                {t.nav.support}
              </Link>
            </li>
            <li>
              <Link href={link(locale, "/account/returns")} className="text-muted-foreground hover:text-foreground">
                {t.returns.title}
              </Link>
            </li>
            <li>
              <Link href={link(locale, "/compare")} className="text-muted-foreground hover:text-foreground">
                {t.nav.compare}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">{t.footer.account}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href={link(locale, "/account")} className="text-muted-foreground hover:text-foreground">
                {t.nav.account}
              </Link>
            </li>
            <li>
              <Link href={link(locale, "/vendor")} className="text-muted-foreground hover:text-foreground">
                {t.nav.vendor}
              </Link>
            </li>
            <li>
              <Link href={link(locale, "/auth/login")} className="text-muted-foreground hover:text-foreground">
                {t.nav.login}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t py-6 text-center text-xs text-muted-foreground">
        © {year} {t.brand.name}. {t.footer.rights}
      </div>
    </footer>
  );
}
