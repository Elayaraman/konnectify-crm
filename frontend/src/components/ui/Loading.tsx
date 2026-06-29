type LoadingProps = {
  rows?: number;
  title?: string;
};

export function Loading({ rows = 6, title = "Loading data" }: LoadingProps) {
  return (
    <div
      aria-label={title}
      className="rounded-lg border border-neutral-200 bg-white p-5"
      role="status"
    >
      <div className="mb-5 h-4 w-40 animate-pulse rounded bg-neutral-200" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            className="grid grid-cols-4 gap-4 border-b border-neutral-100 pb-3 last:border-0 last:pb-0"
            key={index}
          >
            <div className="h-3 animate-pulse rounded bg-neutral-200" />
            <div className="h-3 animate-pulse rounded bg-neutral-100" />
            <div className="h-3 animate-pulse rounded bg-neutral-100" />
            <div className="h-3 animate-pulse rounded bg-neutral-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
