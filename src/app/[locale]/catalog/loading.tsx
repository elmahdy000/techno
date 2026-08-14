import { ProductGridSkeleton } from "@/components/product/product-card-skeleton";

export default function CatalogLoading() {
  return (
    <div className="container py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="space-y-4 rounded-lg border p-4">
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          </div>
        </aside>
        <div>
          <ProductGridSkeleton count={12} />
        </div>
      </div>
    </div>
  );
}
