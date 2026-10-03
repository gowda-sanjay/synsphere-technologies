export default function DashboardLoading() {
  return (
    <div className="shell py-8 md:py-10">
      <div className="overflow-hidden rounded-[28px] border border-[#e5e9e2] bg-white shadow-[0_20px_60px_rgba(17,31,31,0.08)]">
        <div className="flex min-h-[720px] flex-col md:flex-row">
          <aside className="hidden w-72 flex-col border-r border-[#e5e9e2] bg-[#f7f8f3] p-6 md:flex">
            <div className="mb-8 h-10 w-32 animate-pulse rounded-md bg-[#edf0ea]" />
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-11 animate-pulse rounded-md bg-[#edf0ea]" />
              ))}
            </div>
          </aside>
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="mb-8 h-20 animate-pulse rounded-2xl bg-[#edf0ea]" />
            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-2xl bg-[#edf0ea]" />
              ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(290px,0.8fr)]">
              <div className="space-y-6">
                <div className="h-52 animate-pulse rounded-2xl bg-[#edf0ea]" />
                <div className="h-64 animate-pulse rounded-2xl bg-[#edf0ea]" />
              </div>
              <div className="space-y-6">
                <div className="h-52 animate-pulse rounded-2xl bg-[#edf0ea]" />
                <div className="h-64 animate-pulse rounded-2xl bg-[#edf0ea]" />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
