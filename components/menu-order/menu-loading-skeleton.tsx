export function MenuLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <div className="h-9 w-52 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--border)_55%,white)]" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-[1.35rem] border border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_55%,white)] shadow-sm"
          />
        ))}
      </div>
    </div>
  );
}
