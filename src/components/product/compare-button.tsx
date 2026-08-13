"use client";

import { useCallback, useState } from "react";
import { Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale } from "@/i18n/client";
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
  const router = useRouter();
  const [active, setActive] = useState(() => readCompare().includes(productId));

  const toggle = useCallback(() => {
    const current = readCompare();
    const isPresent = current.includes(productId);
    const next = isPresent
      ? current.filter((id) => id !== productId)
      : current.length >= MAX_COMPARE
        ? current
        : [...current, productId];

    if (!isPresent && next === current) {
      toast.error("Maximum 4 products");
      return;
    }

    window.localStorage.setItem(KEY, JSON.stringify(next));
    setActive(!isPresent);
    toast.success(isPresent ? "Removed from compare" : "Added to compare", {
      action: !isPresent
        ? {
            label: "View",
            onClick: () => router.push(link(locale, "/compare")),
          }
        : undefined,
    });
  }, [productId, locale, router]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Compare"
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
