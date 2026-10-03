import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { ApplyPanel } from "@/components/applications/apply-panel";
import { DataSourceNotice } from "@/components/public/data-source-notice";
import { PageHero } from "@/components/public/public-components";
import { getPublicJob } from "@/lib/services/jobs";
import { getApplicationReview } from "@/lib/services/applications";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type JobDetailPageProps = { params: Promise<{ id: string }> };

function formatDate(value: string | null) {
  if (!value) return "Not specified";
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export async function generateMetadata({ params }: JobDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const { data: job } = await getPublicJob(id);
  return job ? { title: `${job.title} at ${job.company} — SynSphere`, description: job.description } : { title: "Role not found — SynSphere" };
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
  const result = await getPublicJob(id);
  if (result.error) {
    return <><PageHero eyebrow="CAREER OPPORTUNITIES" title={<>Job details<br /><span>are unavailable.</span></>} description="We couldn’t load this role right now. Please try again later." primaryHref="/jobs" primaryLabel="Back to jobs" /><DataSourceNotice source={result.source} error={result.error} /></>;
  }
  const job = result.data;
  if (!job) notFound();
  const supabase = await createSupabaseServerClient();
  const { data: authData } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const isAuthenticated = Boolean(authData.user);
  const reviewResult = isAuthenticated && result.source === "supabase"
    ? await getApplicationReview(job.id)
    : null;

  return (
    <>
      <section className="job-detail-hero"><div className="shell"><Link className="back-link" href="/jobs"><ArrowLeft size={15} aria-hidden="true" />All jobs</Link><div className="job-detail-heading">{job.companyInfo.logo_url ? <Image src={job.companyInfo.logo_url} alt={`${job.company} logo`} width={64} height={64} unoptimized className="h-16 w-16 rounded-xl object-contain" /> : <span className="job-company-mark job-company-mark-large" aria-hidden="true">{job.company.slice(0, 1)}</span>}<div><span className="eyebrow">{result.source === "demo" ? "SAMPLE ROLE · " : "ROLE · "}{job.company.toUpperCase()}</span><h1>{job.title}</h1><p>{job.company}</p></div></div><div className="job-detail-meta"><span><MapPin size={15} aria-hidden="true" />{job.location}</span><span>{job.jobType}</span><span>{job.experience}</span>{job.salary !== "Salary not listed" ? <strong>{job.salary}</strong> : null}</div>{result.source === "demo" ? <div className="job-detail-alert">Sample job listing. Applications are disabled for sample roles.</div> : null}</div></section>
      <section className="shell job-detail-content"><article className="job-description"><span className="eyebrow">ROLE OVERVIEW</span><h2>About the opportunity</h2><p>{job.description}</p>{job.responsibilities.length ? <><h3>Responsibilities</h3><ul className="list-disc space-y-2 pl-5">{job.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul></> : null}{job.requirements.length ? <><h3>Requirements</h3><ul className="list-disc space-y-2 pl-5">{job.requirements.map((item) => <li key={item}>{item}</li>)}</ul></> : null}<h3>Skills</h3><div className="detail-skill-list">{job.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><section className="mt-10 border-t border-[#e5e9e2] pt-6"><span className="eyebrow">COMPANY</span><h2 className="mt-2">{job.company}</h2>{job.companyInfo.industry ? <p className="mt-2">{job.companyInfo.industry}</p> : null}{job.companyInfo.location ? <p className="mt-1">{job.companyInfo.location}</p> : null}{job.companyInfo.description ? <p className="mt-4">{job.companyInfo.description}</p> : null}{job.companyInfo.website ? <a className="text-action mt-4" href={job.companyInfo.website} target="_blank" rel="noreferrer">Company website <ArrowUpRight size={14} aria-hidden="true" /></a> : null}</section></article><aside className="job-apply-panel" id="apply"><span className="eyebrow">ROLE DETAILS</span><h2>{job.title}</h2><dl><div><dt>Company</dt><dd>{job.company}</dd></div><div><dt>Location</dt><dd>{job.location}</dd></div><div><dt>Employment</dt><dd>{job.jobType}</dd></div><div><dt>Experience</dt><dd>{job.experience}</dd></div>{job.salary !== "Salary not listed" ? <div><dt>Salary</dt><dd>{job.salary}</dd></div> : null}<div><dt>Posted</dt><dd><CalendarDays size={14} aria-hidden="true" />{formatDate(job.postedDate)}</dd></div>{job.deadline ? <div><dt>Application deadline</dt><dd>{formatDate(job.deadline)}</dd></div> : null}</dl><ApplyPanel jobId={job.id} jobTitle={job.title} companyName={job.company} isAuthenticated={isAuthenticated} review={reviewResult?.data ?? null} reviewError={reviewResult?.error ?? null} source={result.source} /></aside></section>
      <DataSourceNotice source={result.source} error={null} />
    </>
  );
}