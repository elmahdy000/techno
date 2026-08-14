import { ProductGridSkeleton } from "@/components/product/product-card-skeleton";

export default function LocaleLoading() {
  return (
    <div className="container pb-16">
      {/* Hero skeleton */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 to-primary/10 rtl:bg-gradient-to-l sm:mt-6">
        <div className="grid gap-6 p-6 sm:p-12 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="h-9 w-3/4 animate-pulse rounded-lg bg-muted sm:h-12" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="flex gap-3 pt-2">
              <div className="h-11 w-32 animate-pulse rounded-md bg-muted" />
              <div className="h-11 w-36 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 self-center sm:gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/60 sm:h-28" />
            ))}
          </div>
        </div>
      </div>

      {/* Categories skeleton */}
      <div className="mt-12">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border bg-card sm:h-32" />
          ))}
        </div>
      </div>

      {/* Featured products skeleton */}
      <div className="mt-14">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6">
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    </div>
  );
}
