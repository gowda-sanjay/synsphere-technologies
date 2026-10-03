import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness, CircleHelp } from "lucide-react";
import { JobExplorer } from "@/components/public/job-explorer";
import { DataSourceNotice } from "@/components/public/data-source-notice";
import { PageHero } from "@/components/public/public-components";
import { getPublishedJobs } from "@/lib/services/jobs";

export const metadata: Metadata = {
  title: "Jobs & Career Opportunities — SynSphere",
  description: "Search current technology job listings and career opportunities through SynSphere.",
};

export default async function JobsPage() {
  const result = await getPublishedJobs();

  return (
    <>
      <PageHero
        eyebrow="CAREER OPPORTUNITIES"
        title={<>Find work that<br /><span>moves you forward.</span></>}
        description="Explore roles across technology, data, design, and cloud. Use the filters to focus on the opportunities that fit your next step."
        primaryHref="/contact"
        primaryLabel="Ask us a question"
        note={result.source === "demo" ? "Sample listings for preview only. Availability and details are not verified." : undefined}
      />
      <DataSourceNotice source={result.source} error={result.error} />
      <JobExplorer jobs={result.data} source={result.source} error={result.error} />
      <section className="jobs-disclaimer shell"><span><BriefcaseBusiness size={17} aria-hidden="true" /></span><p><strong>Looking for a role?</strong> {result.source === "demo" ? "Listings shown here are sample content. " : "Review the role details and your profile before applying."}</p><Link href="/contact"><CircleHelp size={14} aria-hidden="true" />Need help?</Link></section>
    </>
  );
}