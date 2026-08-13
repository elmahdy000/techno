import { formatMoney, formatMoneyShort } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Price({
  price,
  compareAtPrice,
  className,
  short,
}: {
  price: number;
  compareAtPrice?: number | null;
  className?: string;
  short?: boolean;
}) {
  const fmt = short ? formatMoneyShort : formatMoney;
  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span className="text-base font-bold">{fmt(price)}</span>
      {compareAtPrice && compareAtPrice > price ? (
        <span className="text-sm text-muted-foreground line-through">
          {fmt(compareAtPrice)}
        </span>
      ) : null}
    </div>
  );
}

export function discountPercent(price: number, compareAtPrice?: number | null) {
  if (!compareAtPrice || compareAtPrice <= price) return null;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}
