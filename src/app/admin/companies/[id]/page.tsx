import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, ExternalLink, MapPin } from "lucide-react";
import { getAdminCompanyDetail } from "@/lib/services/admin-companies";

type PageProps = { params: Promise<{ id: string }> };
export const metadata: Metadata = { title: "Company Details — SynSphere", robots: { index: false, follow: false } };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function safeWebsite(value: string | null) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function jobActive(status: string, vacancies: number, deadline: string | null) {
  const today = new Date().toISOString().slice(0, 10);
  return status === "published" && vacancies > 0 && (!deadline || deadline >= today);
}

export default async function AdminCompanyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getAdminCompanyDetail(id);
  if (!result) notFound();
  if (result?.error || !result?.company) {
    return <div role="alert" className="mx-auto max-w-5xl border border-[#efc9bd] bg-[#fff5f2] p-5 text-sm text-[#913c30]">{result?.error ?? "Unable to load company."}</div>;
  }

  const { company } = result;
  const website = safeWebsite(company.website);

  return (
    <div className="mx-auto max-w-[1200px]">
      <Link href="/admin/companies" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-[#176b55] hover:underline"><ArrowLeft size={14} aria-hidden="true" />All companies</Link>
      <div className="mb-6 flex min-w-0 flex-col gap-4 border-b border-[#dce4dd] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">{company.logo_url ? <Image src={company.logo_url} alt="" width={56} height={56} unoptimized className="h-14 w-14 shrink-0 rounded border border-[#dce4dd] object-contain" /> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded bg-[#e7f1eb] text-[#145b48]"><BriefcaseBusiness size={22} aria-hidden="true" /></span>}<div className="min-w-0"><p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">COMPANY PROFILE</p><h1 className="mt-1 break-words font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">{company.name}</h1>{company.industry ? <p className="mt-1 text-sm text-[#657474]">{company.industry}</p> : null}</div></div>
        <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${company.status === "active" ? "bg-[#e7f1eb] text-[#145b48]" : "bg-[#f0f1ed] text-[#52616d]"}`}>{company.status}</span>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="min-w-0 border border-[#e1e7e1] bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-base font-semibold text-[#152b2b]">Company information</h2><Link href="/admin/companies" className="text-xs font-semibold text-[#176b55] hover:underline">Edit from list</Link></div>
          <dl className="space-y-4 text-sm">
            <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Location</dt><dd className="mt-1 flex items-start gap-2 break-words text-[#152b2b]">{company.location ? <><MapPin size={14} className="mt-0.5 shrink-0 text-[#176b55]" aria-hidden="true" />{company.location}</> : "Not provided"}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Website</dt><dd className="mt-1 break-all text-[#152b2b]">{website ? <a href={website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#176b55] hover:underline">{website}<ExternalLink size={12} aria-hidden="true" /></a> : "Not provided"}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Description</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-6 text-[#425252]">{company.description || "Not provided"}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Created</dt><dd className="mt-1 text-[#152b2b]">{formatDate(company.created_at)}</dd></div>
          </dl>
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[#edf0eb] pt-5"><div><dt className="text-xs text-[#657474]">Jobs</dt><dd className="mt-1 text-2xl font-semibold tabular-nums text-[#152b2b]">{company.job_count}</dd></div><div><dt className="text-xs text-[#657474]">Applications</dt><dd className="mt-1 text-2xl font-semibold tabular-nums text-[#152b2b]">{company.application_count}</dd></div></dl>
        </section>

        <section className="min-w-0 border border-[#e1e7e1] bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-[9px] font-bold tracking-[0.14em] text-[#176b55]">RECRUITMENT</p><h2 className="mt-1 text-base font-semibold text-[#152b2b]">Related jobs</h2></div><Link href="/admin/jobs" className="text-xs font-semibold text-[#176b55] hover:underline">Manage jobs</Link></div>
          {result.jobs.length ? <div className="divide-y divide-[#edf0eb]">{result.jobs.map((job) => <article key={job.id} className="flex min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h3 className="break-words text-sm font-semibold text-[#152b2b]">{job.title}</h3><p className="mt-1 break-words text-xs text-[#657474]">{job.location} · {job.job_type} · {job.vacancies} vacancies</p><p className="mt-1 text-[10px] text-[#657474]">Deadline: {job.application_deadline ? formatDate(job.application_deadline) : "Not set"} · {job.application_count} applications · Created {formatDate(job.created_at)}</p></div><div className="flex shrink-0 items-center justify-between gap-3 sm:block sm:text-right"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${job.status === "published" ? "bg-[#e7f1eb] text-[#145b48]" : "bg-[#f0f1ed] text-[#52616d]"}`}>{job.status}</span><p className="mt-2 text-[10px] text-[#657474]">{jobActive(job.status, job.vacancies, job.application_deadline) ? "Active" : "Closed"}</p></div></article>)}</div> : <div className="border border-dashed border-[#d5ded6] px-4 py-10 text-center"><p className="text-sm font-semibold text-[#152b2b]">No jobs linked to this company</p><Link href="/admin/jobs" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#176b55] hover:underline">Manage jobs <ArrowRight size={13} aria-hidden="true" /></Link></div>}
        </section>
      </div>
    </div>
  );
}