"use client";

import { useCallback, useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale, useT } from "@/i18n/client";
import { link } from "@/lib/links";
import { cn } from "@/lib/utils";

const KEY = "tm_compare";
export const MAX_COMPARE = 4;

export function readCompare(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CompareButton({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [active, setActive] = useState(false);

  // Read localStorage only on the client after hydration to avoid
  // SSR/client HTML mismatch (React hydration error).
  useEffect(() => {
    setActive(readCompare().includes(productId));
  }, [productId]);

  const toggle = useCallback(() => {
    const current = readCompare();
    const isPresent = current.includes(productId);
    const next = isPresent
      ? current.filter((id) => id !== productId)
      : current.length >= MAX_COMPARE
        ? current
        : [...current, productId];

    if (!isPresent && next === current) {
      toast.error(t.product.compareMax);
      return;
    }

    window.localStorage.setItem(KEY, JSON.stringify(next));
    setActive(!isPresent);
    toast.success(isPresent ? t.product.compareRemoved : t.common.compareAdded, {
      action: !isPresent
        ? {
            label: t.common.view,
            onClick: () => router.push(link(locale, "/compare")),
          }
        : undefined,
    });
  }, [productId, locale, router, t]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={active ? t.common.removeFromCompare : t.common.addToCompare}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background transition-colors hover:bg-accent",
        className,
      )}
    >
      <Scale
        className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")}
      />
    </button>
  );
}
