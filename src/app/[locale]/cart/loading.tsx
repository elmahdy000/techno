export default function CartLoading() {
  return (
    <div className="container py-8">
      <div className="h-7 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 rounded-lg border p-4">
              <div className="h-20 w-20 animate-pulse rounded-md bg-muted" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                <div className="h-8 w-1/2 animate-pulse rounded-md bg-muted" />
              </div>
            </div>
          ))}
        </div>
        <aside className="h-fit space-y-3 rounded-lg border p-5">
          <div className="h-5 w-28 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-11 w-full animate-pulse rounded-md bg-muted" />
        </aside>
      </div>
    </div>
  );
}
