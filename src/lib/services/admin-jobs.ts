import "server-only";

import type { Database } from "../../../types/database";
import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type CompanyRow = Pick<Database["public"]["Tables"]["companies"]["Row"], "id" | "name" | "status">;

export type AdminJobRow = Pick<JobRow,
  "id" | "title" | "company_id" | "location" | "job_type" | "experience" | "salary" | "skills" | "description" | "responsibilities" | "requirements" | "vacancies" | "application_deadline" | "status" | "created_at" | "updated_at"
> & {
  company_name: string;
  application_count: number;
};

export type AdminJobsData = {
  jobs: AdminJobRow[];
  companies: CompanyRow[];
  total: number;
  error: string | null;
};

function emptyData(error: string | null): AdminJobsData {
  return { jobs: [], companies: [], total: 0, error };
}

export async function getAdminJobsData(): Promise<AdminJobsData> {
  if (!(await isCurrentUserAdmin())) return emptyData("Unable to load jobs.");

  const supabase = await createSupabaseServerClient();
  if (!supabase) return emptyData("Unable to load jobs.");

  const [jobResult, companyResult] = await Promise.all([
    supabase.from("jobs")
      .select("id,title,company_id,location,job_type,experience,salary,skills,description,responsibilities,requirements,vacancies,application_deadline,status,created_at,updated_at,company:companies!jobs_company_id_fkey(name),application_rows:applications!applications_job_id_fkey(job_id)", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(1000)
      .overrideTypes<Array<Pick<JobRow,
        "id" | "title" | "company_id" | "location" | "job_type" | "experience" | "salary" | "skills" | "description" | "responsibilities" | "requirements" | "vacancies" | "application_deadline" | "status" | "created_at" | "updated_at"
      > & {
        company: { name: string } | null;
        application_rows: Array<{ job_id: string }>;
      }>, { merge: false }>(),
    supabase.from("companies")
      .select("id,name,status")
      .order("name", { ascending: true })
      .limit(1000)
      .overrideTypes<CompanyRow[], { merge: false }>(),
  ]);

  if (jobResult.error || companyResult.error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[admin-jobs] Load failed", {
        jobs: jobResult.error ? {
          code: jobResult.error.code,
          message: jobResult.error.message,
          details: jobResult.error.details,
          hint: jobResult.error.hint,
        } : null,
        companies: companyResult.error ? {
          code: companyResult.error.code,
          message: companyResult.error.message,
          details: companyResult.error.details,
          hint: companyResult.error.hint,
        } : null,
      });
    }
    return emptyData("Unable to load jobs.");
  }

  return {
    jobs: (jobResult.data ?? []).map((job) => ({
      id: job.id,
      title: job.title,
      company_id: job.company_id,
      location: job.location,
      job_type: job.job_type,
      experience: job.experience,
      salary: job.salary,
      skills: job.skills,
      description: job.description,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      vacancies: job.vacancies,
      application_deadline: job.application_deadline,
      status: job.status,
      created_at: job.created_at,
      updated_at: job.updated_at,
      company_name: job.company?.name ?? "Unknown company",
      application_count: job.application_rows?.length ?? 0,
    })),
    companies: companyResult.data ?? [],
    total: jobResult.count ?? 0,
    error: null,
  };
}