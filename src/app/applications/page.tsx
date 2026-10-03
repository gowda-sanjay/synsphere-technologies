import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness } from "lucide-react";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { getMyApplications } from "@/lib/services/applications";

export const metadata: Metadata = { title: "My Applications — SynSphere", robots: { index: false, follow: false } };

export default async function ApplicationsPage() {
  await requireCurrentUser("/applications");
  const result = await getMyApplications();

  return (
    <section className="shell py-8 md:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 border-b border-[#e5e9e2] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">CAREER ACTIVITY</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#152b2b]">My applications</h1>
            <p className="mt-2 text-sm text-[#657474]">Review your submitted applications and current status.</p>
          </div>
          <Link href="/jobs" className="button button-dark">Browse jobs <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>

        {result.error ? (
          <div className="mt-8 rounded-xl border border-[#f0d8d0] bg-[#fff5f2] p-5 text-sm text-[#9a3f2f]" role="status">{result.error}</div>
        ) : result.data.length ? (
          <div className="mt-6 divide-y divide-[#e5e9e2]">
            {result.data.map((application) => (
              <article key={application.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="eyebrow">{application.companyName}</p>
                  <h2 className="mt-1 truncate text-lg font-semibold text-[#152b2b]">{application.jobTitle}</h2>
                  {application.location ? <p className="mt-1 text-sm text-[#657474]">{application.location}</p> : null}
                  <p className="mt-2 text-xs text-[#657474]">Applied {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(application.created_at))}</p>
                </div>
                <div className="flex items-center gap-3 sm:shrink-0">
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${application.status === "selected" ? "bg-[#e8f5e9] text-[#24643b]" : application.status === "rejected" ? "bg-[#fff0ed] text-[#9a3f2f]" : "bg-[#edf3ec] text-[#176b55]"}`}>
                    {application.status.replaceAll("_", " ")}
                  </span>
                  <Link className="button button-outline px-3 py-2 text-xs" href={`/applications/${application.id}`}>Details</Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-[#d9e1d5] bg-[#fbfcf8] px-5 py-12 text-center">
            <BriefcaseBusiness className="mx-auto text-[#176b55]" size={24} aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-[#152b2b]">No applications yet</h2>
            <p className="mt-1 text-sm text-[#657474]">When you apply for a job, it will appear here.</p>
            <Link href="/jobs" className="button button-green mt-5">Explore jobs</Link>
          </div>
        )}
        {result.data.length === 50 ? <p className="mt-5 text-xs text-[#657474]">Showing your 50 most recent applications.</p> : null}
      </div>
    </section>
  );
}