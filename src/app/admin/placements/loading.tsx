export default function AdminPlacementsLoading() {
  return (
    <div className="mx-auto max-w-[1400px] animate-pulse">
      <div className="mb-6 border-b border-[#dce4dd] pb-5"><div className="h-3 w-40 rounded bg-[#dce4dd]" /><div className="mt-3 h-8 w-64 rounded bg-[#dce4dd]" /><div className="mt-2 h-4 w-36 rounded bg-[#e7ebe5]" /></div>
      <div className="mb-5 h-20 rounded border border-[#e1e7e1] bg-white" />
      <div className="mb-5 h-28 rounded border border-[#e1e7e1] bg-white" />
      <div className="space-y-3">{[0, 1, 2].map((item) => <div key={item} className="h-32 rounded border border-[#e1e7e1] bg-white" />)}</div>
    </div>
  );
}
