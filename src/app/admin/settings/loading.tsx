export default function AdminSettingsLoading() {
  return (
    <div className="mx-auto max-w-[1200px] animate-pulse" aria-label="Loading admin settings" role="status">
      <div className="mb-6 border-b border-[#dce4dd] pb-5"><div className="h-3 w-36 rounded bg-[#e4e9e3]" /><div className="mt-3 h-8 w-64 rounded bg-[#e4e9e3]" /></div>
      <div className="grid gap-5 xl:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-52 border border-[#e1e7e1] bg-white" />)}</div>
      <div className="mt-5 h-80 border border-[#e1e7e1] bg-white" />
    </div>
  );
}
