import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText, Search } from "lucide-react";
import { APPLICATION_STATUSES, ADMIN_APPLICATION_PAGE_SIZE, getAdminApplications } from "@/lib/services/admin-applications";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = { title: "Application Management — SynSphere", robots: { index: false, follow: false } };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusClass(status: string) {
  if (status === "selected") return "bg-[#e7f1eb] text-[#145b48]";
  if (status === "rejected") return "bg-[#fff0ed] text-[#913c30]";
  if (status === "shortlisted" || status === "interview") return "bg-[#e9eef7] text-[#35598b]";
  return "bg-[#f0f1ed] text-[#52616d]";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function pageHref(page: number, values: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
  if (page > 0) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/applications?${query}` : "/admin/applications";
}

export default async function AdminApplicationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const values = {
    q: (first(params.q) ?? "").slice(0, 100),
    status: first(params.status) ?? "",
    job: first(params.job) ?? "",
    company: first(params.company) ?? "",
    from: first(params.from) ?? "",
    to: first(params.to) ?? "",
  };
  const requestedPage = Number.parseInt(first(params.page) ?? "0", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(0, Math.min(requestedPage, 10000)) : 0;
  const data = await getAdminApplications({
    search: values.q,
    status: values.status,
    jobId: values.job,
    companyId: values.company,
    dateFrom: values.from,
    dateTo: values.to,
    page,
  });
  const startNumber = data.total ? data.page * ADMIN_APPLICATION_PAGE_SIZE + 1 : 0;
  const endNumber = Math.min((data.page + 1) * ADMIN_APPLICATION_PAGE_SIZE, data.total);
  const currentFilters = { q: values.q, status: values.status, job: values.job, company: values.company, from: values.from, to: values.to };

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6 flex flex-col gap-3 border-b border-[#dce4dd] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">PLATFORM OPERATIONS</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">Application management</h1>
          <p className="mt-1 text-sm text-[#657474]">{data.total.toLocaleString("en-IN")} applications</p>
        </div>
        <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-semibold text-[#176b55] hover:underline"><ArrowLeft size={14} aria-hidden="true" />Admin dashboard</Link>
      </div>

      {data.error ? <div role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{data.error}</div> : null}

      <form method="get" className="mb-5 border border-[#e1e7e1] bg-white p-4 sm:p-5" aria-label="Search and filter applications">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="relative min-w-0 sm:col-span-2 xl:col-span-1"><span className="sr-only">Search applicant, job, or company</span><Search className="pointer-events-none absolute left-3 top-3 text-[#657474]" size={15} aria-hidden="true" /><input name="q" defaultValue={values.q} maxLength={100} className="min-h-10 w-full rounded border border-[#ccd7ce] pl-9 pr-3 text-sm" placeholder="Applicant, job, company" /></label>
          <label className="min-w-0"><span className="sr-only">Application status</span><select name="status" defaultValue={values.status} className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm"><option value="">All statuses</option>{APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
          <label className="min-w-0"><span className="sr-only">Job</span><select name="job" defaultValue={values.job} className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm"><option value="">All jobs</option>{data.jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label>
          <label className="min-w-0"><span className="sr-only">Company</span><select name="company" defaultValue={values.company} className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm"><option value="">All companies</option>{data.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label className="grid min-w-0 gap-1 text-[10px] font-semibold text-[#657474]">From date<input type="date" name="from" defaultValue={values.from} className="min-h-10 w-full rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" /></label>
          <label className="grid min-w-0 gap-1 text-[10px] font-semibold text-[#657474]">To date<input type="date" name="to" defaultValue={values.to} className="min-h-10 w-full rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" /></label>
          <div className="flex flex-wrap items-end gap-2">
            <button type="submit" className="button button-dark min-h-10">Apply filters</button>
            <Link href="/admin/applications" className="button button-outline min-h-10">Clear</Link>
          </div>
        </div>
      </form>

      {!data.error && data.applications.length === 0 ? (
        <div className="border border-dashed border-[#d5ded6] bg-white px-5 py-12 text-center">
          <FileText className="mx-auto text-[#176b55]" size={24} aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-[#152b2b]">No applications found</h2>
          <p className="mt-1 text-sm text-[#657474]">Try a different search or filter.</p>
        </div>
      ) : null}

      {data.applications.length ? (
        <>
          <div className="hidden overflow-x-auto border border-[#e1e7e1] bg-white lg:block">
            <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
              <thead className="bg-[#f3f6f2] text-[10px] uppercase tracking-[0.08em] text-[#657474]"><tr>{["Applicant", "Contact", "Job", "Company", "Location", "Status", "Applied", "Application ID"].map((heading) => <th key={heading} className="px-3 py-3 font-bold">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#edf0eb]">{data.applications.map((application) => (
                <tr key={application.id}>
                  <td className="max-w-48 px-3 py-3 font-semibold text-[#152b2b]">{application.applicant_name}</td>
                  <td className="max-w-52 px-3 py-3 text-[#425252]"><p className="truncate">{application.applicant_email ?? "—"}</p><p className="mt-1 text-[#657474]">{application.applicant_mobile ?? "—"}</p></td>
                  <td className="max-w-52 px-3 py-3 text-[#152b2b]">{application.job_title}</td><td className="px-3 py-3 text-[#425252]">{application.company_name}</td><td className="px-3 py-3 text-[#425252]">{application.location || "—"}</td>
                  <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${statusClass(application.status)}`}>{statusLabel(application.status)}</span></td>
                  <td className="whitespace-nowrap px-3 py-3 text-[#657474]">{formatDate(application.created_at)}</td><td className="max-w-40 px-3 py-3"><Link href={`/admin/applications/${application.id}`} className="break-all font-mono text-[10px] text-[#176b55] hover:underline">{application.id}</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:hidden">{data.applications.map((application) => (
            <article key={application.id} className="min-w-0 border border-[#e1e7e1] bg-white p-4">
              <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-sm font-semibold text-[#152b2b]">{application.applicant_name}</h2><p className="mt-1 break-all text-xs text-[#657474]">{application.applicant_email ?? "Email unavailable"}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${statusClass(application.status)}`}>{statusLabel(application.status)}</span></div>
              <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-xs"><div><dt className="text-[#657474]">Mobile</dt><dd className="mt-0.5 break-words text-[#152b2b]">{application.applicant_mobile ?? "—"}</dd></div><div><dt className="text-[#657474]">Applied</dt><dd className="mt-0.5 text-[#152b2b]">{formatDate(application.created_at)}</dd></div><div><dt className="text-[#657474]">Job</dt><dd className="mt-0.5 break-words text-[#152b2b]">{application.job_title}</dd></div><div><dt className="text-[#657474]">Company</dt><dd className="mt-0.5 break-words text-[#152b2b]">{application.company_name}</dd></div><div><dt className="text-[#657474]">Location</dt><dd className="mt-0.5 break-words text-[#152b2b]">{application.location || "—"}</dd></div><div className="col-span-2"><dt className="text-[#657474]">Application ID</dt><dd className="mt-0.5 break-all font-mono text-[10px] text-[#152b2b]">{application.id}</dd></div></dl>
              <Link href={`/admin/applications/${application.id}`} className="button button-outline mt-4 min-h-9 w-full">Application details <ArrowRight size={13} aria-hidden="true" /></Link>
            </article>
          ))}</div>

          <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Application pages">
            <p className="text-xs text-[#657474]">Showing {startNumber.toLocaleString("en-IN")}–{endNumber.toLocaleString("en-IN")} of {data.total.toLocaleString("en-IN")}</p>
            <div className="flex gap-2"><Link aria-disabled={data.page === 0} tabIndex={data.page === 0 ? -1 : undefined} className={`button button-outline min-h-9 px-3 ${data.page === 0 ? "pointer-events-none opacity-50" : ""}`} href={pageHref(data.page - 1, currentFilters)}><ArrowLeft size={14} aria-hidden="true" />Previous</Link><Link aria-disabled={(data.page + 1) * ADMIN_APPLICATION_PAGE_SIZE >= data.total} tabIndex={(data.page + 1) * ADMIN_APPLICATION_PAGE_SIZE >= data.total ? -1 : undefined} className={`button button-outline min-h-9 px-3 ${(data.page + 1) * ADMIN_APPLICATION_PAGE_SIZE >= data.total ? "pointer-events-none opacity-50" : ""}`} href={pageHref(data.page + 1, currentFilters)}>Next<ArrowRight size={14} aria-hidden="true" /></Link></div>
          </nav>
        </>
      ) : null}
    </div>
  );
}