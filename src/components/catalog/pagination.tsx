"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { link } from "@/lib/links";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function pageHref(p: number) {
    const next = new URLSearchParams(searchParams.toString());
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    const qs = next.toString();
    const base = link(locale, pathname.replace(`/${locale}`, ""));
    return `${base}${qs ? `?${qs}` : ""}`;
  }

  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="flex items-center justify-center gap-1">
      <PaginationLink
        href={pageHref(Math.max(1, page - 1))}
        disabled={page <= 1}
        aria-label={t.common.previous}
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
      </PaginationLink>
      {start > 1 && (
        <>
          <PaginationLink href={pageHref(1)} aria-label={`${t.common.page ?? "Page"} 1`}>1</PaginationLink>
          {start > 2 && <span className="px-1 text-muted-foreground">…</span>}
        </>
      )}
      {pages.map((p) => (
        <PaginationLink key={p} href={pageHref(p)} active={p === page} aria-current={p === page ? "page" : undefined} aria-label={`${t.common.page ?? "Page"} ${p}`}>
          {p}
        </PaginationLink>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="px-1 text-muted-foreground">…</span>
          )}
          <PaginationLink href={pageHref(totalPages)} aria-label={`${t.common.page ?? "Page"} ${totalPages}`}>{totalPages}</PaginationLink>
        </>
      )}
      <PaginationLink
        href={pageHref(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        aria-label={t.common.next}
      >
        <ChevronRight className="h-4 w-4 rtl:rotate-180" />
      </PaginationLink>
    </nav>
  );
}

function PaginationLink({
  href,
  disabled,
  active,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href"> & {
  href: string;
  disabled?: boolean;
  active?: boolean;
}) {
  if (disabled) {
    return (
      <span
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm text-muted-foreground/50",
        )}
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm transition-colors hover:bg-accent",
        active && "border-primary bg-primary text-primary-foreground hover:bg-primary",
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
