export default function AdminUserDetailLoading() {
  return (
    <div className="mx-auto max-w-[1200px] animate-pulse" aria-label="Loading user profile" role="status">
      <div className="mb-5 h-4 w-24 rounded bg-[#e4e9e3]" />
      <div className="mb-6 h-16 border-b border-[#dce4dd] bg-white" />
      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]"><div className="space-y-5"><div className="h-72 border border-[#e1e7e1] bg-white" /><div className="h-56 border border-[#e1e7e1] bg-white" /></div><div className="space-y-5"><div className="h-40 border border-[#e1e7e1] bg-white" /><div className="h-32 border border-[#e1e7e1] bg-white" /></div></div>
    </div>
  );
}