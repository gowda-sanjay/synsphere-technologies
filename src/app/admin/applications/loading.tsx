export default function AdminApplicationsLoading() {
  return (
    <div className="mx-auto max-w-[1400px] animate-pulse" aria-label="Loading applications" role="status">
      <div className="mb-6 border-b border-[#dce4dd] pb-5"><div className="h-3 w-40 rounded bg-[#e4e9e3]" /><div className="mt-3 h-8 w-72 rounded bg-[#e4e9e3]" /></div>
      <div className="mb-5 grid gap-3 border border-[#e1e7e1] bg-white p-5 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-10 rounded bg-[#edf0eb]" />)}</div>
      <div className="space-y-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-16 rounded border border-[#e1e7e1] bg-white" />)}</div>
    </div>
  );
}