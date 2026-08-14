export default function CheckoutLoading() {
  return (
    <div className="container py-8">
      <div className="h-7 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-5">
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
              <div className="h-16 w-full animate-pulse rounded-md bg-muted" />
              <div className="h-16 w-full animate-pulse rounded-md bg-muted" />
            </div>
          ))}
        </div>
        <aside className="h-fit space-y-3 rounded-lg border p-5">
          <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-11 w-full animate-pulse rounded-md bg-muted" />
        </aside>
      </div>
    </div>
  );
}
