export default function AdminReportsLoading() {
  return (
    <div className="mx-auto max-w-[1400px] animate-pulse" aria-label="Loading reports" role="status">
      <div className="mb-6 border-b border-[#dce4dd] pb-5"><div className="h-3 w-36 rounded bg-[#e4e9e3]" /><div className="mt-3 h-8 w-64 rounded bg-[#e4e9e3]" /></div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 9 }, (_, index) => <div key={index} className="h-28 border border-[#e1e7e1] bg-white" />)}</div>
      <div className="mb-6 h-24 border border-[#e1e7e1] bg-white" />
      <div className="grid gap-4 xl:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-80 border border-[#e1e7e1] bg-white" />)}</div>
    </div>
  );
}
