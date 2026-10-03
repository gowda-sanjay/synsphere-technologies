import type { Metadata } from "next";
import {
  Activity,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  FileText,
  GraduationCap,
  RefreshCw,
  Users,
} from "lucide-react";
import { AdminReportsCharts } from "@/components/admin/admin-reports-charts";
import { getAdminReports, type ReportRange } from "@/lib/services/admin-reports";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = { title: "Admin Reports — SynSphere", robots: { index: false, follow: false } };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const supportedRanges: ReportRange[] = ["today", "7d", "30d", "90d", "year", "custom"];

function summaryCards(totals: Awaited<ReturnType<typeof getAdminReports>>["totals"]) {
  return [
    { label: "Total users", value: totals.users, icon: Users, color: "text-[#176b55] bg-[#e7f1eb]" },
    { label: "Total companies", value: totals.companies, icon: Building2, color: "text-[#7b493e] bg-[#f5eae6]" },
    { label: "Active jobs", value: totals.activeJobs, icon: BriefcaseBusiness, color: "text-[#8c552d] bg-[#f7eee5]" },
    { label: "Total applications", value: totals.applications, icon: FileText, color: "text-[#35598b] bg-[#e9eef7]" },
    { label: "Total courses", value: totals.courses, icon: BookOpen, color: "text-[#6c5334] bg-[#f3efe5]" },
    { label: "Total enrollments", value: totals.enrollments, icon: GraduationCap, color: "text-[#6c5334] bg-[#f3efe5]" },
    { label: "Total placements", value: totals.placements, icon: Activity, color: "text-[#486c4b] bg-[#eaf0e5]" },
    { label: "Total notifications", value: totals.notifications, icon: Bell, color: "text-[#3e7880] bg-[#e8f1f1]" },
    { label: "Unread notifications", value: totals.unreadNotifications, icon: Bell, color: "text-[#3e7880] bg-[#e8f1f1]" },
  ];
}

export default async function AdminReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requestedRange = first(params.range) ?? "30d";
  const range: ReportRange = supportedRanges.includes(requestedRange as ReportRange) ? requestedRange as ReportRange : "30d";
  const from = (first(params.from) ?? "").slice(0, 10);
  const to = (first(params.to) ?? "").slice(0, 10);
  const reports = await getAdminReports({ range, from, to });

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6 flex flex-col gap-3 border-b border-[#dce4dd] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">PLATFORM OPERATIONS</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">Reports &amp; analytics</h1>
          <p className="mt-1 text-sm text-[#657474]">Read-only, aggregate reporting from current platform records.</p>
        </div>
        <a href={`/admin/reports?${new URLSearchParams({ range, ...(range === "custom" ? { from, to } : {}) }).toString()}`} className="inline-flex min-h-9 w-fit items-center gap-2 rounded border border-[#ccd7ce] bg-white px-3 text-xs font-semibold text-[#176b55] hover:border-[#176b55]">
          <RefreshCw size={14} aria-hidden="true" />Refresh report
        </a>
      </div>

      {reports.error ? <div role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{reports.error}</div> : null}
      {reports.range.warning ? <div role="status" className="mb-5 border border-[#ead9b7] bg-[#fffaf0] p-4 text-sm text-[#735c2c]">{reports.range.warning}</div> : null}

      {!reports.error ? <section aria-label="All-time platform totals">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-base font-semibold text-[#152b2b]">Platform totals <span className="ml-1 text-xs font-normal text-[#657474]">All time</span></h2>
          <p className="text-[11px] text-[#657474]">Active jobs have published status, vacancies, and an open application deadline.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
          {summaryCards(reports.totals).map(({ label, value, icon: Icon, color }) => (
            <article key={label} className="flex min-h-[108px] items-center justify-between gap-4 border border-[#e1e7e1] bg-white p-4 sm:p-5">
              <div><p className="text-xs font-medium text-[#657474]">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums text-[#152b2b]">{value.toLocaleString("en-IN")}</p></div>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded ${color}`}><Icon size={18} aria-hidden="true" /></span>
            </article>
          ))}
        </div>
      </section> : null}

      <form method="get" action="/admin/reports" className="my-6 border border-[#e1e7e1] bg-white p-4 sm:p-5" aria-label="Report date range">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,0.7fr)_minmax(180px,0.7fr)_minmax(180px,0.7fr)_auto] xl:items-end">
          <label className="min-w-0"><span className="mb-1 block text-xs font-semibold text-[#425252]">Date range</span><select name="range" defaultValue={range} className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm"><option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="year">This year</option><option value="custom">Custom range</option></select></label>
          <label className="min-w-0"><span className="mb-1 block text-xs font-semibold text-[#425252]">From</span><input type="date" name="from" defaultValue={from} className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm" /></label>
          <label className="min-w-0"><span className="mb-1 block text-xs font-semibold text-[#425252]">To</span><input type="date" name="to" defaultValue={to} className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm" /></label>
          <button type="submit" className="button button-dark min-h-10">Apply range</button>
        </div>
        <p className="mt-3 text-[11px] text-[#657474]">Selected period: {reports.range.label}. Summary cards remain all-time; date-filtered breakdowns and trends use each record’s created date.</p>
      </form>

      {!reports.error ? <AdminReportsCharts trends={reports.trends} distributions={reports.distributions} rangeLabel={reports.range.label} /> : null}
    </div>
  );
}
