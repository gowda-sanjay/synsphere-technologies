import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { PublicJobListing } from "@/lib/services/jobs";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function JobCard({ job }: { job: PublicJobListing }) {
  return (
    <article className="job-card">
      <div className="job-card-main">
        <span className="job-company-mark" aria-hidden="true">{job.company.slice(0, 1)}</span>
        <div className="job-card-title"><span className="job-company">{job.company}</span><h2><Link href={`/jobs/${job.id}`}>{job.title}</Link></h2></div>
        <span className="job-posted">Posted {formatDate(job.postedDate)}</span>
      </div>
      <div className="job-facts">
        <span><MapPin size={14} aria-hidden="true" />{job.location}</span>
        <span>{job.jobType}</span>
        <span>{job.experience}</span>
        <strong>{job.salary}</strong>
      </div>
      <div className="job-card-bottom">
        <div className="skill-list" aria-label="Required skills">{job.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
        <div className="job-actions">
          <Link className="text-action" href={`/jobs/${job.id}`}>View details <ArrowRight size={14} aria-hidden="true" /></Link>
          <Link className="button button-green" href={`/jobs/${job.id}#apply`}>Apply now <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
      </div>
    </article>
  );
}