"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { JobCard } from "@/components/public/job-card";
import type { PublicJobListing } from "@/lib/services/jobs";
import type { DataSource } from "@/lib/services/result";

export function JobExplorer({ jobs, source, error }: { jobs: PublicJobListing[]; source: DataSource; error?: string | null }) {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("All locations");
  const [experience, setExperience] = useState("All experience");
  const [jobType, setJobType] = useState("All job types");
  const [company, setCompany] = useState("All companies");

  const locations = ["All locations", ...new Set(jobs.map((job) => job.location.split(",")[0]))];
  const companies = ["All companies", ...new Set(jobs.map((job) => job.company))];
  const experiences = ["All experience", ...new Set(jobs.map((job) => job.experience))];
  const jobTypes = ["All job types", ...new Set(jobs.map((job) => job.jobType))];
  const visibleJobs = jobs
    .filter((job) => job.status === "open")
    .filter((job) => location === "All locations" || job.location.startsWith(location))
    .filter((job) => experience === "All experience" || job.experience === experience)
    .filter((job) => jobType === "All job types" || job.jobType === jobType)
    .filter((job) => company === "All companies" || job.company === company)
    .filter((job) => `${job.title} ${job.company} ${job.location} ${job.skills.join(" ")}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((first, second) => second.postedDate.localeCompare(first.postedDate));

  return (
    <>
      <section className="filter-panel shell" aria-label="Filter job listings">
        <div className="filter-panel-heading"><SlidersHorizontal size={17} aria-hidden="true" /><span>Find the right opportunity</span>{source === "demo" ? <span className="filter-demo-tag">Sample listings</span> : null}</div>
        <div className="filter-grid job-filter-grid">
          <label className="filter-search"><span>Search jobs</span><span className="input-with-icon"><Search size={16} aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Role, skill, or company" /></span></label>
          <label><span>Location</span><select value={location} onChange={(event) => setLocation(event.target.value)}>{locations.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Experience</span><select value={experience} onChange={(event) => setExperience(event.target.value)}>{experiences.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Job type</span><select value={jobType} onChange={(event) => setJobType(event.target.value)}>{jobTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Company</span><select value={company} onChange={(event) => setCompany(event.target.value)}>{companies.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
      </section>
      <div className="catalog-results shell" aria-live="polite"><span>{visibleJobs.length} open jobs</span><span>Sorted by newest</span></div>
      {error ? (
        <div className="empty-state shell" role="status"><Search size={22} aria-hidden="true" /><h2>Job listings aren’t available right now</h2><p>Please try again later.</p></div>
      ) : visibleJobs.length ? (
        <div className="job-list shell">{visibleJobs.map((job) => <JobCard job={job} key={job.id} />)}</div>
      ) : (
        <div className="empty-state shell"><Search size={22} aria-hidden="true" /><h2>No jobs found.</h2><p>{search || location !== "All locations" || experience !== "All experience" || jobType !== "All job types" || company !== "All companies" ? "Try another search or broaden your filters." : "Please check back soon."}</p>{search || location !== "All locations" || experience !== "All experience" || jobType !== "All job types" || company !== "All companies" ? <button className="button button-outline" onClick={() => { setSearch(""); setLocation("All locations"); setExperience("All experience"); setJobType("All job types"); setCompany("All companies"); }}>Clear Filters</button> : null}</div>
      )}
    </>
  );
}