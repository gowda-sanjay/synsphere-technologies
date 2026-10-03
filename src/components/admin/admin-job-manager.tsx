"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Check, ChevronDown, Edit3, Plus, Search, X } from "lucide-react";
import { createAdminJob, setAdminJobStatus, updateAdminJob } from "@/app/actions/admin-jobs";

type JobStatus = "draft" | "published" | "closed" | "archived";
type AdminJob = {
  id: string;
  title: string;
  company_id: string;
  company_name: string;
  location: string;
  job_type: string;
  experience: string;
  salary: string | null;
  skills: string[];
  description: string;
  responsibilities: string[];
  requirements: string[];
  vacancies: number;
  application_deadline: string | null;
  status: JobStatus;
  created_at: string;
  application_count: number;
};
type CompanyOption = { id: string; name: string; status: "active" | "inactive" };
type JobFormValues = {
  title: string;
  company_id: string;
  location: string;
  job_type: string;
  experience: string;
  salary: string;
  skills: string;
  description: string;
  responsibilities: string;
  requirements: string;
  vacancies: string;
  application_deadline: string;
};

const emptyForm: JobFormValues = {
  title: "",
  company_id: "",
  location: "",
  job_type: "",
  experience: "",
  salary: "",
  skills: "",
  description: "",
  responsibilities: "",
  requirements: "",
  vacancies: "1",
  application_deadline: "",
};

function dateLabel(value: string | null) {
  if (!value) return "No deadline";
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? "Invalid date" : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

function isActive(job: AdminJob) {
  const today = new Date().toISOString().slice(0, 10);
  return job.status === "published" && job.vacancies > 0 && (!job.application_deadline || job.application_deadline >= today);
}

function statusClass(status: JobStatus) {
  if (status === "published") return "bg-[#e7f1eb] text-[#145b48]";
  if (status === "closed") return "bg-[#f7eee5] text-[#8c552d]";
  if (status === "archived") return "bg-[#f1eeee] text-[#746565]";
  return "bg-[#edf0f2] text-[#52616d]";
}

function formFromJob(job: AdminJob): JobFormValues {
  return {
    title: job.title,
    company_id: job.company_id,
    location: job.location,
    job_type: job.job_type,
    experience: job.experience,
    salary: job.salary ?? "",
    skills: job.skills.join("\n"),
    description: job.description,
    responsibilities: job.responsibilities.join("\n"),
    requirements: job.requirements.join("\n"),
    vacancies: String(job.vacancies),
    application_deadline: job.application_deadline?.slice(0, 10) ?? "",
  };
}

export function AdminJobManager({ initialJobs, companies, total, loadError }: {
  initialJobs: AdminJob[];
  companies: CompanyOption[];
  total: number;
  loadError: string | null;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [publication, setPublication] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [employment, setEmployment] = useState("all");
  const [companyId, setCompanyId] = useState("all");
  const [form, setForm] = useState<JobFormValues | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyForm, setBusyForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const jobTypes = [...new Set(initialJobs.map((job) => job.job_type).filter(Boolean))].sort();
  const visibleJobs = initialJobs.filter((job) => {
    const term = search.trim().toLowerCase();
    if (term && !`${job.title} ${job.company_name} ${job.location}`.toLowerCase().includes(term)) return false;
    if (publication === "published" && job.status !== "published") return false;
    if (publication === "unpublished" && job.status === "published") return false;
    if (availability === "active" && !isActive(job)) return false;
    if (availability === "closed" && isActive(job)) return false;
    if (employment !== "all" && job.job_type !== employment) return false;
    if (companyId !== "all" && job.company_id !== companyId) return false;
    return true;
  });

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function startCreate() {
    clearMessages();
    setEditingId(null);
    setForm({ ...emptyForm, company_id: companies.find((company) => company.status === "active")?.id ?? companies[0]?.id ?? "" });
  }

  function startEdit(job: AdminJob) {
    clearMessages();
    setEditingId(job.id);
    setForm(formFromJob(job));
  }

  async function saveJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || busyForm) return;
    clearMessages();
    setBusyForm(true);
    try {
      const result = editingId ? await updateAdminJob(editingId, form) : await createAdminJob(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setForm(null);
      setEditingId(null);
      setSuccess(editingId ? "Job updated." : "Job created as a draft. Publish it when ready.");
      router.refresh();
    } catch {
      setError("The job could not be saved. Please try again.");
    } finally {
      setBusyForm(false);
    }
  }

  async function changeStatus(job: AdminJob, nextStatus: "draft" | "published" | "closed") {
    if (busyId) return;
    if (nextStatus === "closed" && !window.confirm(`Close “${job.title}”? This stops new applications.`)) return;
    clearMessages();
    setBusyId(job.id);
    try {
      const result = await setAdminJobStatus(job.id, nextStatus);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const message = nextStatus === "published" ? "Job published." : nextStatus === "closed" ? "Job closed." : "Job unpublished.";
      setSuccess(message);
      router.refresh();
    } catch {
      setError("The job status could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  function renderActions(job: AdminJob) {
    if (job.status === "archived") return <span className="text-xs text-[#657474]">Archived</span>;
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded border border-[#dce4dd] px-2.5 text-xs font-semibold text-[#425252] hover:bg-[#f7f8f3]" onClick={() => startEdit(job)} aria-label={`Edit ${job.title}`}>
          <Edit3 size={13} aria-hidden="true" />Edit
        </button>
        {job.status === "published" ? (
          <>
            <button type="button" className="min-h-9 rounded border border-[#dce4dd] px-2.5 text-xs font-semibold text-[#425252] hover:bg-[#f7f8f3]" onClick={() => changeStatus(job, "draft")} disabled={busyId === job.id}>Unpublish</button>
            <button type="button" className="min-h-9 rounded border border-[#e6c9bd] px-2.5 text-xs font-semibold text-[#913c30] hover:bg-[#fff5f2]" onClick={() => changeStatus(job, "closed")} disabled={busyId === job.id}>Close</button>
          </>
        ) : (
          <button type="button" className="min-h-9 rounded bg-[#176b55] px-2.5 text-xs font-semibold text-white hover:bg-[#145b48]" onClick={() => changeStatus(job, "published")} disabled={busyId === job.id || !companies.some((company) => company.id === job.company_id && company.status === "active")}>
            {busyId === job.id ? "Updating..." : "Publish"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6 flex flex-col gap-3 border-b border-[#dce4dd] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">PLATFORM OPERATIONS</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">Job management</h1>
          <p className="mt-1 text-sm text-[#657474]">{total.toLocaleString("en-IN")} jobs in Supabase</p>
        </div>
        <button type="button" className="button button-dark min-h-10 self-start sm:self-auto" onClick={form ? () => setForm(null) : startCreate}>
          {form ? <X size={15} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}{form ? "Cancel" : "Add Job"}
        </button>
      </div>

      {loadError ? <div role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{loadError}</div> : null}
      {error ? <div role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{error}</div> : null}
      {success ? <div role="status" className="mb-5 flex items-center gap-2 border border-[#cfe4d6] bg-[#f2f9f3] p-4 text-sm text-[#145b48]"><Check size={15} aria-hidden="true" />{success}</div> : null}

      {form ? (
        <section className="mb-6 border border-[#dce4dd] bg-white p-4 sm:p-6" aria-labelledby="job-form-title">
          <div className="mb-5 flex items-start justify-between gap-3 border-b border-[#e5e9e2] pb-4">
            <div><p className="text-[9px] font-bold tracking-[0.14em] text-[#176b55]">JOB DETAILS</p><h2 id="job-form-title" className="mt-1 text-lg font-semibold text-[#152b2b]">{editingId ? "Edit job" : "Add a job"}</h2></div>
            {!editingId ? <span className="rounded bg-[#edf0f2] px-2.5 py-1 text-[10px] font-semibold text-[#52616d]">Saved as draft</span> : null}
          </div>
          <form onSubmit={saveJob} className="grid min-w-0 gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252]">Job title<input className="min-h-10 min-w-0 rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={180} required /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252]">Company<select className="min-h-10 min-w-0 rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" value={form.company_id} onChange={(event) => setForm({ ...form, company_id: event.target.value })} required><option value="">Select a company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}{company.status === "inactive" ? " (inactive)" : ""}</option>)}</select></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252]">Location<input className="min-h-10 min-w-0 rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} maxLength={180} required /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252]">Employment type<input className="min-h-10 min-w-0 rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" value={form.job_type} onChange={(event) => setForm({ ...form, job_type: event.target.value })} maxLength={80} placeholder="Full-time, contract, internship" required /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252]">Experience<input className="min-h-10 min-w-0 rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} maxLength={100} placeholder="0-2 years" required /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252]">Salary<input className="min-h-10 min-w-0 rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" value={form.salary} onChange={(event) => setForm({ ...form, salary: event.target.value })} maxLength={180} /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252]">Vacancies<input type="number" min="0" max="100000" step="1" className="min-h-10 min-w-0 rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" value={form.vacancies} onChange={(event) => setForm({ ...form, vacancies: event.target.value })} required /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252]">Application deadline<input type="date" className="min-h-10 min-w-0 rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" value={form.application_deadline} onChange={(event) => setForm({ ...form, application_deadline: event.target.value })} /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252] md:col-span-2">Description<textarea className="min-h-24 min-w-0 rounded border border-[#ccd7ce] px-3 py-2 text-sm font-normal text-[#152b2b]" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={8000} required /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252]">Skills<textarea className="min-h-20 min-w-0 rounded border border-[#ccd7ce] px-3 py-2 text-sm font-normal text-[#152b2b]" value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder="One per line" maxLength={3000} /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252]">Responsibilities<textarea className="min-h-20 min-w-0 rounded border border-[#ccd7ce] px-3 py-2 text-sm font-normal text-[#152b2b]" value={form.responsibilities} onChange={(event) => setForm({ ...form, responsibilities: event.target.value })} placeholder="One per line" maxLength={8000} /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252] md:col-span-2">Requirements<textarea className="min-h-20 min-w-0 rounded border border-[#ccd7ce] px-3 py-2 text-sm font-normal text-[#152b2b]" value={form.requirements} onChange={(event) => setForm({ ...form, requirements: event.target.value })} placeholder="One per line" maxLength={8000} /></label>
            <div className="flex flex-wrap gap-3 border-t border-[#e5e9e2] pt-4 md:col-span-2">
              <button type="submit" className="button button-dark min-h-10" disabled={busyForm}>{busyForm ? "Saving..." : editingId ? "Save changes" : "Create draft"}</button>
              <button type="button" className="button button-outline min-h-10" onClick={() => { setForm(null); setEditingId(null); }} disabled={busyForm}>Cancel</button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="mb-5 border border-[#e1e7e1] bg-white p-4 sm:p-5" aria-label="Search and filter jobs">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="relative min-w-0 sm:col-span-2 xl:col-span-1"><span className="sr-only">Search title, company, or location</span><Search className="pointer-events-none absolute left-3 top-3 text-[#657474]" size={15} aria-hidden="true" /><input className="min-h-10 w-full min-w-0 rounded border border-[#ccd7ce] pl-9 pr-3 text-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs" /></label>
          <label className="relative min-w-0"><span className="sr-only">Publication status</span><select className="min-h-10 w-full appearance-none rounded border border-[#ccd7ce] bg-white px-3 pr-8 text-sm" value={publication} onChange={(event) => setPublication(event.target.value)}><option value="all">All publication states</option><option value="published">Published</option><option value="unpublished">Unpublished</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3 text-[#657474]" size={14} /></label>
          <label className="relative min-w-0"><span className="sr-only">Availability</span><select className="min-h-10 w-full appearance-none rounded border border-[#ccd7ce] bg-white px-3 pr-8 text-sm" value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="all">All availability</option><option value="active">Active</option><option value="closed">Closed or unavailable</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3 text-[#657474]" size={14} /></label>
          <label className="relative min-w-0"><span className="sr-only">Employment type</span><select className="min-h-10 w-full appearance-none rounded border border-[#ccd7ce] bg-white px-3 pr-8 text-sm" value={employment} onChange={(event) => setEmployment(event.target.value)}><option value="all">All employment types</option>{jobTypes.map((type) => <option key={type}>{type}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 text-[#657474]" size={14} /></label>
          <label className="relative min-w-0"><span className="sr-only">Company</span><select className="min-h-10 w-full appearance-none rounded border border-[#ccd7ce] bg-white px-3 pr-8 text-sm" value={companyId} onChange={(event) => setCompanyId(event.target.value)}><option value="all">All companies</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 text-[#657474]" size={14} /></label>
        </div>
        <p className="mt-3 text-xs text-[#657474]" aria-live="polite">Showing {visibleJobs.length} of {total} jobs</p>
      </section>

      {!loadError && visibleJobs.length === 0 ? (
        <div className="border border-dashed border-[#d5ded6] bg-white px-5 py-12 text-center">
          <BriefcaseBusiness className="mx-auto text-[#176b55]" size={24} aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-[#152b2b]">No jobs found</h2>
          <p className="mt-1 text-sm text-[#657474]">Try changing your search or filters.</p>
        </div>
      ) : null}

      {visibleJobs.length ? (
        <>
          <div className="hidden overflow-x-auto border border-[#e1e7e1] bg-white lg:block">
            <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
              <thead className="bg-[#f3f6f2] text-[10px] uppercase tracking-[0.08em] text-[#657474]"><tr>{["Job", "Company", "Location", "Type", "Vacancies", "Salary", "Deadline", "Applications", "Status", "Created", "Actions"].map((heading) => <th key={heading} className="px-3 py-3 font-bold">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#edf0eb]">{visibleJobs.map((job) => (
                <tr key={job.id}>
                  <td className="max-w-56 px-3 py-3 font-semibold text-[#152b2b]">{job.title}</td><td className="px-3 py-3 text-[#425252]">{job.company_name}</td><td className="px-3 py-3 text-[#425252]">{job.location}</td><td className="px-3 py-3 text-[#425252]">{job.job_type}</td><td className="px-3 py-3 tabular-nums text-[#425252]">{job.vacancies}</td><td className="px-3 py-3 text-[#425252]">{job.salary || "—"}</td><td className="px-3 py-3 text-[#425252]">{dateLabel(job.application_deadline)}</td><td className="px-3 py-3 tabular-nums text-[#425252]">{job.application_count}</td>
                  <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${statusClass(job.status)}`}>{job.status}</span><span className="mt-1 block text-[10px] text-[#657474]">{isActive(job) ? "Active" : "Closed"}</span></td>
                  <td className="whitespace-nowrap px-3 py-3 text-[#657474]">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(job.created_at))}</td><td className="px-3 py-3">{renderActions(job)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="grid gap-3 lg:hidden">
            {visibleJobs.map((job) => (
              <article key={job.id} className="min-w-0 border border-[#e1e7e1] bg-white p-4">
                <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-sm font-semibold text-[#152b2b]">{job.title}</h2><p className="mt-1 truncate text-xs text-[#657474]">{job.company_name}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${statusClass(job.status)}`}>{job.status}</span></div>
                <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-xs"><div><dt className="text-[#657474]">Location</dt><dd className="mt-0.5 break-words text-[#152b2b]">{job.location}</dd></div><div><dt className="text-[#657474]">Employment</dt><dd className="mt-0.5 text-[#152b2b]">{job.job_type}</dd></div><div><dt className="text-[#657474]">Vacancies</dt><dd className="mt-0.5 text-[#152b2b]">{job.vacancies}</dd></div><div><dt className="text-[#657474]">Applications</dt><dd className="mt-0.5 text-[#152b2b]">{job.application_count}</dd></div><div><dt className="text-[#657474]">Salary</dt><dd className="mt-0.5 break-words text-[#152b2b]">{job.salary || "—"}</dd></div><div><dt className="text-[#657474]">Deadline</dt><dd className="mt-0.5 text-[#152b2b]">{dateLabel(job.application_deadline)}</dd></div><div><dt className="text-[#657474]">Availability</dt><dd className="mt-0.5 text-[#152b2b]">{isActive(job) ? "Active" : "Closed"}</dd></div><div><dt className="text-[#657474]">Created</dt><dd className="mt-0.5 text-[#152b2b]">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(job.created_at))}</dd></div></dl>
                <div className="mt-4 border-t border-[#edf0eb] pt-3">{renderActions(job)}</div>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}