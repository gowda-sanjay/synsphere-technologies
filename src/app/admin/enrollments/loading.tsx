export default function AdminEnrollmentsLoading() {
  return (
    <div className="animate-pulse space-y-5" aria-label="Loading enrollments" role="status">
      <div className="h-12 w-64 rounded bg-[#e5e9e2]" />
      <div className="h-24 rounded border border-[#e1e7e1] bg-white" />
      <div className="h-72 rounded border border-[#e1e7e1] bg-white" />
    </div>
  );
}
