export function DataPageLoading({ label }: { label: string }) {
  return (
    <section className="shell public-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="loading-pulse" aria-hidden="true" />
      <div><span className="eyebrow">LOADING</span><p>Loading {label}…</p></div>
    </section>
  );
}