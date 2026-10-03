import type { Metadata } from "next";
import Link from "next/link";
import { Activity, BookOpen, BriefcaseBusiness, Building2, FileText, Users } from "lucide-react";
import { getAdminDashboardData } from "@/lib/services/admin-dashboard";

export const metadata: Metadata = { title: "Admin Dashboard — SynSphere", robots: { index: false, follow: false } };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  if (data.error) {
    return (
      <section role="alert" className="border border-[#efc9bd] bg-[#fff5f2] p-5 sm:p-7">
        <p className="text-sm font-semibold text-[#913c30]">Unable to load admin dashboard.</p>
        <p className="mt-1 text-xs text-[#80594f]">Refresh the page to try again.</p>
      </section>
    );
  }

  const summaries = [
    { label: "Total users", value: data.counts.users, icon: Users, color: "text-[#176b55] bg-[#e7f1eb]" },
    { label: "Active jobs", value: data.counts.activeJobs, icon: BriefcaseBusiness, color: "text-[#8c552d] bg-[#f7eee5]" },
    { label: "Applications", value: data.counts.applications, icon: FileText, color: "text-[#35598b] bg-[#e9eef7]" },
    { label: "Courses", value: data.counts.courses, icon: BookOpen, color: "text-[#6c5334] bg-[#f3efe5]" },
    { label: "Companies", value: data.counts.companies, icon: Building2, color: "text-[#7b493e] bg-[#f5eae6]" },
    { label: "Placements", value: data.counts.placements, icon: Activity, color: "text-[#486c4b] bg-[#eaf0e5]" },
  ];

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-6 flex flex-col gap-1 border-b border-[#dce4dd] pb-5 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">PLATFORM OPERATIONS</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">Dashboard overview</h1>
        </div>
        <p className="text-xs text-[#657474]">Live records from SynSphere</p>
      </div>

      <section className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-3" aria-label="Platform totals">
        {summaries.map(({ label: title, value, icon: Icon, color }) => (
          <article key={title} className="flex min-h-[116px] items-center justify-between gap-4 border border-[#e1e7e1] bg-white p-4 sm:p-5">
            <div>
              <p className="text-xs font-medium text-[#657474]">{title}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-[#152b2b]">{value.toLocaleString("en-IN")}</p>
            </div>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded ${color}`}><Icon size={18} aria-hidden="true" /></span>
          </article>
        ))}
      </section>

      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-2">
        <section className="min-w-0 border border-[#e1e7e1] bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[#e5e9e2] px-4 py-4 sm:px-5">
            <div><p className="text-[9px] font-bold tracking-[0.14em] text-[#176b55]">CANDIDATE ACTIVITY</p><h2 className="mt-1 text-base font-semibold text-[#152b2b]">Recent applications</h2></div>
            <Link href="/admin/applications" className="text-xs font-semibold text-[#176b55] hover:underline">All applications</Link>
          </div>
          {data.recentApplications.length ? (
            <ul className="divide-y divide-[#edf0eb]">
              {data.recentApplications.map((application) => (
                <li key={application.id} className="flex min-w-0 flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#152b2b]">{application.candidateName}</p>
                    {application.candidateEmail ? <p className="truncate text-xs text-[#657474]">{application.candidateEmail}</p> : null}
                    <p className="mt-1 truncate text-xs text-[#425252]">{application.jobTitle} · {application.companyName}</p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 sm:block sm:text-right">
                    <span className="inline-flex rounded-full bg-[#edf3ec] px-2.5 py-1 text-[10px] font-semibold capitalize text-[#176b55]">{label(application.status)}</span>
                    <p className="mt-0 text-[10px] text-[#7b8780] sm:mt-1">{formatDate(application.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="px-5 py-8 text-sm text-[#657474]">No applications have been submitted yet.</p>}
        </section>

        <section className="min-w-0 border border-[#e1e7e1] bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[#e5e9e2] px-4 py-4 sm:px-5">
            <div><p className="text-[9px] font-bold tracking-[0.14em] text-[#176b55]">RECRUITMENT</p><h2 className="mt-1 text-base font-semibold text-[#152b2b]">Recent jobs</h2></div>
            <Link href="/admin/jobs" className="text-xs font-semibold text-[#176b55] hover:underline">All jobs</Link>
          </div>
          {data.recentJobs.length ? (
            <ul className="divide-y divide-[#edf0eb]">
              {data.recentJobs.map((job) => (
                <li key={job.id} className="flex min-w-0 flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#152b2b]">{job.title}</p>
                    <p className="truncate text-xs text-[#657474]">{job.companyName}</p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 sm:block sm:text-right">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${job.status === "published" ? "bg-[#e7f1eb] text-[#176b55]" : "bg-[#f0f1ed] text-[#657474]"}`}>{label(job.status)}</span>
                    <p className="mt-0 text-[10px] text-[#7b8780] sm:mt-1">{formatDate(job.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="px-5 py-8 text-sm text-[#657474]">No jobs have been created yet.</p>}
        </section>

        <section className="min-w-0 border border-[#e1e7e1] bg-white xl:col-span-2">
          <div className="border-b border-[#e5e9e2] px-4 py-4 sm:px-5">
            <p className="text-[9px] font-bold tracking-[0.14em] text-[#176b55]">AUDIT TRAIL</p>
            <h2 className="mt-1 text-base font-semibold text-[#152b2b]">Recent administrative activity</h2>
          </div>
          {data.recentActivity.length ? (
            <ul className="grid divide-y divide-[#edf0eb] sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
              {data.recentActivity.map((activity) => (
                <li key={activity.id} className="flex min-w-0 items-start justify-between gap-4 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-[#152b2b]">{label(activity.action)}</p><p className="mt-1 text-xs text-[#657474]">{label(activity.entity_type)}</p></div>
                  <time className="shrink-0 text-[10px] text-[#7b8780]">{formatDate(activity.created_at)}</time>
                </li>
              ))}
            </ul>
          ) : <p className="px-5 py-7 text-sm text-[#657474]">No administrative activity recorded yet.</p>}
        </section>
      </div>
    </div>
  );
}