import { ProductCardSkeleton } from "@/components/product/product-card-skeleton";

export default function ProductLoading() {
  return (
    <div className="container py-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-xl bg-muted" />
        <div className="space-y-5">
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-40 animate-pulse rounded-lg bg-muted/50" />
          <div className="h-24 animate-pulse rounded-lg bg-muted/50" />
        </div>
      </div>

      <div className="mt-14">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
