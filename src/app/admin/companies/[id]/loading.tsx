export default function AdminCompanyDetailLoading() {
  return (
    <div className="mx-auto max-w-[1200px] animate-pulse" aria-label="Loading company" role="status">
      <div className="mb-5 h-4 w-28 rounded bg-[#e4e9e3]" /><div className="mb-6 h-16 border-b border-[#dce4dd] bg-white" />
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]"><div className="h-72 border border-[#e1e7e1] bg-white" /><div className="h-96 border border-[#e1e7e1] bg-white" /></div>
    </div>
  );
}