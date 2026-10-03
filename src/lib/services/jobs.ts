import "server-only";

import type { Job } from "@/lib/types/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dataResult, SUPABASE_NOT_CONFIGURED, type DataResult } from "./result";
import type { Database } from "../../../types/database";

type PublicJobRow = Pick<Database["public"]["Tables"]["jobs"]["Row"],
  "id" | "title" | "company_id" | "location" | "job_type" | "experience" | "salary" | "skills" | "description" | "responsibilities" | "requirements" | "application_deadline" | "vacancies" | "created_at" | "status"
>;
type PublicCompany = Pick<Database["public"]["Tables"]["companies"]["Row"],
  "id" | "name" | "logo_path" | "website" | "industry" | "location" | "description"
>;

export type PublicJobDetails = Job & {
  responsibilities: string[];
  requirements: string[];
  companyInfo: Pick<PublicCompany, "logo_path" | "website" | "industry" | "location" | "description"> & { logo_url: string | null };
};
export type PublicJobListing = Omit<Job, "companyId">;

function mapJob(row: PublicJobRow, companyName: string): Job {
  return {
    id: row.id,
    title: row.title,
    company: companyName,
    companyId: row.company_id,
    location: row.location,
    jobType: row.job_type as Job["jobType"],
    experience: row.experience,
    salary: row.salary ?? "Salary not listed",
    skills: row.skills,
    description: row.description,
    deadline: row.application_deadline,
    postedDate: row.created_at.slice(0, 10),
    status: "open",
  };
}

function mapJobListing(row: PublicJobRow, companyName: string): PublicJobListing {
  const job = mapJob(row, companyName);
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    jobType: job.jobType,
    experience: job.experience,
    salary: job.salary,
    skills: job.skills,
    description: job.description,
    deadline: job.deadline,
    postedDate: job.postedDate,
    status: job.status,
  };
}

export async function getPublishedJobs(): Promise<DataResult<PublicJobListing[]>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return dataResult([], "demo", SUPABASE_NOT_CONFIGURED);

  const today = new Date().toISOString().slice(0, 10);
  const jobResult = await supabase.from("jobs")
    .select("id,title,company_id,location,job_type,experience,salary,skills,description,responsibilities,requirements,application_deadline,vacancies,created_at,status")
    .eq("status", "published")
    .gt("vacancies", 0)
    .or(`application_deadline.is.null,application_deadline.gte.${today}`)
    .order("created_at", { ascending: false })
    .limit(100)
    .overrideTypes<PublicJobRow[], { merge: false }>();

  if (jobResult.error) return dataResult([], "supabase", "Job listings are temporarily unavailable.");

  const jobRows = jobResult.data ?? [];
  const companyIds = [...new Set(jobRows.map((job) => job.company_id))];
  const companyResult = companyIds.length
    ? await supabase.from("companies")
      .select("id,name")
      .in("id", companyIds)
      .eq("status", "active")
      .overrideTypes<Array<Pick<PublicCompany, "id" | "name">>, { merge: false }>()
    : { data: [], error: null };

  if (companyResult.error) {
    return dataResult([], "supabase", "Job listings are temporarily unavailable.");
  }

  const names = new Map((companyResult.data ?? []).map((company) => [company.id, company.name]));
  const mapped = (jobResult.data ?? [])
    .filter((job) => names.has(job.company_id))
    .map((job) => mapJobListing(job, names.get(job.company_id) ?? "Company"));

  return dataResult(mapped, "supabase");
}

export async function getPublicJob(id: string): Promise<DataResult<PublicJobDetails | null>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return dataResult(null, "demo", SUPABASE_NOT_CONFIGURED);

  const today = new Date().toISOString().slice(0, 10);
  const { data: jobs, error: jobsError } = await supabase.from("jobs")
    .select("id,title,company_id,location,job_type,experience,salary,skills,description,responsibilities,requirements,application_deadline,vacancies,created_at,status")
    .eq("id", id)
    .eq("status", "published")
    .gt("vacancies", 0)
    .or(`application_deadline.is.null,application_deadline.gte.${today}`)
    .limit(1)
    .overrideTypes<PublicJobRow[], { merge: false }>();

  if (jobsError) {
    return dataResult(null, "supabase", "Job details are temporarily unavailable.");
  }
  const job = jobs?.[0];
  if (!job) return dataResult(null, "supabase");

  const { data: company, error: companyError } = await supabase.from("companies")
    .select("id,name,logo_path,website,industry,location,description")
    .eq("id", job.company_id)
    .eq("status", "active")
    .limit(1)
    .overrideTypes<PublicCompany[], { merge: false }>();
  const companyRow = company?.[0];
  if (companyError || !companyRow) return dataResult(null, "supabase", "Job details are temporarily unavailable.");

  const logoUrl = companyRow.logo_path
    ? supabase.storage.from("company-logos").getPublicUrl(companyRow.logo_path).data.publicUrl
    : null;
  let companyWebsite: string | null = null;
  if (companyRow.website) {
    try {
      const parsedWebsite = new URL(companyRow.website);
      if (parsedWebsite.protocol === "https:" || parsedWebsite.protocol === "http:") companyWebsite = parsedWebsite.toString();
    } catch {
      companyWebsite = null;
    }
  }
  return dataResult({
    ...mapJob(job, companyRow.name),
    responsibilities: job.responsibilities,
    requirements: job.requirements,
    companyInfo: {
      logo_path: companyRow.logo_path,
      website: companyWebsite,
      industry: companyRow.industry,
      location: companyRow.location,
      description: companyRow.description,
      logo_url: logoUrl,
    },
  }, "supabase");
}