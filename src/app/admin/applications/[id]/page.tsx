import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, CalendarDays, MapPin, UserRound } from "lucide-react";
import { AdminApplicationControls } from "@/components/admin/admin-application-controls";
import { getAdminApplicationDetail } from "@/lib/services/admin-applications";

type PageProps = { params: Promise<{ id: string }> };
export const metadata: Metadata = { title: "Application Details — SynSphere", robots: { index: false, follow: false } };

function renderStructuredValue(value: unknown) {
  if (value === null || value === undefined || value === "") return <p className="text-sm text-[#8a9690]">Not provided</p>;
  if (Array.isArray(value)) {
    const items = value.filter((item) => item !== null && item !== undefined && item !== "");
    return items.length ? <ul className="grid gap-2 text-sm text-[#425252]">{items.map((item, index) => <li key={index} className="break-words">{typeof item === "string" ? item : JSON.stringify(item)}</li>)}</ul> : <p className="text-sm text-[#8a9690]">Not provided</p>;
  }
  return <p className="break-words text-sm text-[#425252]">{typeof value === "string" ? value : JSON.stringify(value)}</p>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

export default async function AdminApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getAdminApplicationDetail(id);
  if (!result.data && !result.error) notFound();

  if (result.error || !result.data) {
    return <div role="alert" className="mx-auto max-w-4xl border border-[#efc9bd] bg-[#fff5f2] p-5 text-sm text-[#913c30]">{result.error ?? "Unable to load application."}</div>;
  }

  const application = result.data;

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link href="/admin/applications" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-[#176b55] hover:underline"><ArrowLeft size={14} aria-hidden="true" />All applications</Link>
      <div className="mb-6 flex flex-col gap-2 border-b border-[#dce4dd] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0"><p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">APPLICATION REVIEW</p><h1 className="mt-2 break-all font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">{application.applicant.full_name || "Applicant"}</h1><p className="mt-1 break-all text-sm text-[#657474]">{application.job.title} · {application.job.company_name}</p></div>
        <span className="inline-flex w-fit rounded-full bg-[#f0f1ed] px-3 py-1.5 text-xs font-semibold capitalize text-[#52616d]">{application.status.replaceAll("_", " ")}</span>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.8fr)]">
        <div className="min-w-0 space-y-5">
          <section className="border border-[#e1e7e1] bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2"><UserRound size={16} className="text-[#176b55]" aria-hidden="true" /><h2 className="text-base font-semibold text-[#152b2b]">Applicant</h2></div>
            <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Name</dt><dd className="mt-1 break-words text-sm text-[#152b2b]">{application.applicant.full_name || "Not provided"}</dd></div>
              <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Email</dt><dd className="mt-1 break-all text-sm text-[#152b2b]">{application.applicant.email || "Not provided"}</dd></div>
              <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Mobile</dt><dd className="mt-1 break-words text-sm text-[#152b2b]">{application.applicant.mobile || "Not provided"}</dd></div>
              <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Address</dt><dd className="mt-1 break-words text-sm text-[#152b2b]">{application.applicant.address || "Not provided"}</dd></div>
            </dl>
            <div className="mt-5 grid min-w-0 gap-5 border-t border-[#edf0eb] pt-5 sm:grid-cols-2">
              <div><h3 className="mb-2 text-xs font-semibold text-[#152b2b]">Skills</h3>{renderStructuredValue(application.applicant.skills)}</div>
              <div><h3 className="mb-2 text-xs font-semibold text-[#152b2b]">Education</h3>{renderStructuredValue(application.applicant.education)}</div>
              <div className="sm:col-span-2"><h3 className="mb-2 text-xs font-semibold text-[#152b2b]">Experience</h3>{renderStructuredValue(application.applicant.experience)}</div>
            </div>
          </section>

          <section className="border border-[#e1e7e1] bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2"><BriefcaseBusiness size={16} className="text-[#176b55]" aria-hidden="true" /><h2 className="text-base font-semibold text-[#152b2b]">Job and company</h2></div>
            <h3 className="text-lg font-semibold text-[#152b2b]">{application.job.title}</h3>
            <p className="mt-1 text-sm text-[#425252]">{application.job.company_name}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#657474]">
              <span className="inline-flex items-center gap-1.5"><MapPin size={13} aria-hidden="true" />{application.job.location}</span>
              {application.job.company_location ? <span>{application.job.company_location}</span> : null}
              <span>{application.job.job_type}</span>
            </div>
            <div className="mt-5 border-t border-[#edf0eb] pt-4"><h4 className="mb-2 text-xs font-semibold text-[#152b2b]">Description</h4><p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#425252]">{application.job.description}</p></div>
            <div className="mt-5 grid min-w-0 gap-5 border-t border-[#edf0eb] pt-4 sm:grid-cols-2">
              <div><h4 className="mb-2 text-xs font-semibold text-[#152b2b]">Requirements</h4>{renderStructuredValue(application.job.requirements)}</div>
              <div><h4 className="mb-2 text-xs font-semibold text-[#152b2b]">Responsibilities</h4>{renderStructuredValue(application.job.responsibilities)}</div>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-5">
          <section className="border border-[#e1e7e1] bg-white p-4 sm:p-5">
            <p className="text-[10px] font-bold tracking-[0.13em] text-[#176b55]">APPLICATION</p>
            <dl className="mt-4 space-y-4 text-sm">
              <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Application ID</dt><dd className="mt-1 break-all font-mono text-xs text-[#152b2b]">{application.id}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Applied</dt><dd className="mt-1 inline-flex items-center gap-2 text-sm text-[#152b2b]"><CalendarDays size={14} aria-hidden="true" />{formatDate(application.created_at)}</dd></div>
            </dl>
          </section>
          <section className="border border-[#e1e7e1] bg-white p-4 sm:p-5">
            <p className="mb-4 text-[10px] font-bold tracking-[0.13em] text-[#176b55]">REVIEW ACTIONS</p>
            <AdminApplicationControls applicationId={application.id} initialStatus={application.status} resumeAvailable={application.resume.available} resumeFileName={application.resume.file_name} />
          </section>
        </aside>
      </div>
    </div>
  );
}