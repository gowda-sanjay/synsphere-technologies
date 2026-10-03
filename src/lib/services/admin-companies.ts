import "server-only";

import type { Database } from "../../../types/database";
import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ADMIN_COMPANY_PAGE_SIZE = 25;
const QUERY_PAGE_SIZE = 1000;

type CompanyRow = Pick<Database["public"]["Tables"]["companies"]["Row"],
  "id" | "name" | "logo_path" | "website" | "industry" | "location" | "description" | "status" | "created_at" | "updated_at"
>;
type RelatedJobRow = Pick<Database["public"]["Tables"]["jobs"]["Row"],
  "id" | "company_id" | "title" | "location" | "job_type" | "vacancies" | "application_deadline" | "status" | "created_at"
>;

export type AdminCompanyRow = Omit<CompanyRow, "logo_path"> & {
  logo_url: string | null;
  job_count: number;
  application_count: number;
};

export type AdminCompanyJob = Omit<RelatedJobRow, "company_id"> & { application_count: number };

export type AdminCompanyListData = {
  companies: AdminCompanyRow[];
  total: number;
  page: number;
  error: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emptyList = (page: number, error: string | null): AdminCompanyListData => ({ companies: [], total: 0, page, error });

function logFailure(operation: string, error: { code?: string; message?: string } | null) {
  if (error && process.env.NODE_ENV !== "production") {
    console.error(`[admin-companies] ${operation} failed`, { code: error.code ?? null, message: error.message ?? null });
  }
}

async function fetchJobsForCompanies(companyIds: string[]) {
  const jobs: RelatedJobRow[] = [];
  if (!companyIds.length) return { jobs, error: null };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { jobs, error: { message: "Supabase is not configured." } };

  for (let offset = 0; ; offset += QUERY_PAGE_SIZE) {
    const { data, error } = await supabase.from("jobs")
      .select("id,company_id,title,location,job_type,vacancies,application_deadline,status,created_at")
      .in("company_id", companyIds)
      .order("created_at", { ascending: false })
      .range(offset, offset + QUERY_PAGE_SIZE - 1)
      .overrideTypes<RelatedJobRow[], { merge: false }>();
    if (error) return { jobs: [], error };
    const rows = data ?? [];
    jobs.push(...rows);
    if (rows.length < QUERY_PAGE_SIZE) break;
  }
  return { jobs, error: null };
}

async function fetchApplicationCounts(jobIds: string[]) {
  const counts = new Map<string, number>();
  if (!jobIds.length) return { counts, error: null };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { counts, error: { message: "Supabase is not configured." } };

  for (let index = 0; index < jobIds.length; index += 100) {
    const batch = jobIds.slice(index, index + 100);
    for (let offset = 0; ; offset += QUERY_PAGE_SIZE) {
      const { data, error } = await supabase.from("applications")
        .select("job_id")
        .in("job_id", batch)
        .range(offset, offset + QUERY_PAGE_SIZE - 1)
        .overrideTypes<Array<{ job_id: string }>, { merge: false }>();
      if (error) return { counts, error };
      const rows = data ?? [];
      for (const row of rows) counts.set(row.job_id, (counts.get(row.job_id) ?? 0) + 1);
      if (rows.length < QUERY_PAGE_SIZE) break;
    }
  }
  return { counts, error: null };
}

async function getAdminClient() {
  if (!(await isCurrentUserAdmin())) return null;
  return createSupabaseServerClient();
}

async function searchCompanyIds(search: string): Promise<{ ids: string[]; error: { message: string; code?: string } | null }> {
  const supabase = await getAdminClient();
  if (!supabase) return { ids: [], error: { message: "Not authorized." } };
  const pattern = `%${search}%`;
  const [nameResult, locationResult, websiteResult] = await Promise.all([
    supabase.from("companies").select("id").ilike("name", pattern).limit(10000).overrideTypes<Array<{ id: string }>, { merge: false }>(),
    supabase.from("companies").select("id").ilike("location", pattern).limit(10000).overrideTypes<Array<{ id: string }>, { merge: false }>(),
    supabase.from("companies").select("id").ilike("website", pattern).limit(10000).overrideTypes<Array<{ id: string }>, { merge: false }>(),
  ]);
  const error = nameResult.error ?? locationResult.error ?? websiteResult.error;
  if (error) return { ids: [], error };
  return { ids: [...new Set([...(nameResult.data ?? []), ...(locationResult.data ?? []), ...(websiteResult.data ?? [])].map((row) => row.id))], error: null };
}

export async function getAdminCompanies(filters: { search?: string; status?: string; page?: number } = {}): Promise<AdminCompanyListData> {
  const page = Number.isSafeInteger(filters.page) && (filters.page ?? 0) >= 0 ? Math.min(filters.page ?? 0, 10000) : 0;
  const supabase = await getAdminClient();
  if (!supabase) return emptyList(page, "Unable to load companies.");

  let companyIds: string[] | null = null;
  const search = (filters.search ?? "").trim().slice(0, 100);
  if (search) {
    const searchResult = await searchCompanyIds(search);
    if (searchResult.error) {
      logFailure("Company search", searchResult.error);
      return emptyList(page, "Unable to search companies.");
    }
    companyIds = searchResult.ids;
    if (!companyIds.length) return emptyList(page, null);
  }

  let query = supabase.from("companies")
    .select("id,name,logo_path,website,industry,location,description,status,created_at,updated_at", { count: "exact" });
  if (filters.status === "active" || filters.status === "inactive") query = query.eq("status", filters.status);
  if (companyIds) query = query.in("id", companyIds);

  const { data, error, count } = await query
    .order("name", { ascending: true })
    .range(page * ADMIN_COMPANY_PAGE_SIZE, (page + 1) * ADMIN_COMPANY_PAGE_SIZE - 1)
    .overrideTypes<CompanyRow[], { merge: false }>();
  if (error) {
    logFailure("Company list", error);
    return emptyList(page, "Unable to load companies.");
  }

  const rows = data ?? [];
  const jobResult = await fetchJobsForCompanies(rows.map((company) => company.id));
  if (jobResult.error) {
    logFailure("Company job counts", jobResult.error);
    return emptyList(page, "Unable to load companies.");
  }
  const applicationResult = await fetchApplicationCounts(jobResult.jobs.map((job) => job.id));
  if (applicationResult.error) {
    logFailure("Company application counts", applicationResult.error);
    return emptyList(page, "Unable to load companies.");
  }

  const jobsByCompany = new Map<string, RelatedJobRow[]>();
  for (const job of jobResult.jobs) {
    const companyJobs = jobsByCompany.get(job.company_id) ?? [];
    companyJobs.push(job);
    jobsByCompany.set(job.company_id, companyJobs);
  }

  return {
    companies: rows.map((company) => {
      const companyJobs = jobsByCompany.get(company.id) ?? [];
      return {
        id: company.id,
        name: company.name,
        website: company.website,
        industry: company.industry,
        location: company.location,
        description: company.description,
        status: company.status,
        created_at: company.created_at,
        updated_at: company.updated_at,
        logo_url: company.logo_path ? supabase.storage.from("company-logos").getPublicUrl(company.logo_path).data.publicUrl : null,
        job_count: companyJobs.length,
        application_count: companyJobs.reduce((total, job) => total + (applicationResult.counts.get(job.id) ?? 0), 0),
      };
    }),
    total: count ?? 0,
    page,
    error: null,
  };
}

async function logCompanyView(adminUserId: string, companyId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  const { error } = await supabase.from("admin_activity_logs").insert({
    admin_user_id: adminUserId,
    action: "company_viewed",
    entity_type: "company",
    entity_id: companyId,
    metadata: {},
  });
  logFailure("Company view audit", error);
}

export async function getAdminCompanyDetail(id: string): Promise<{
  company: Omit<CompanyRow, "logo_path"> & { logo_url: string | null; job_count: number; application_count: number };
  jobs: Array<AdminCompanyJobRow>;
  error: string | null;
} | null> {
  if (!uuidPattern.test(id)) return null;
  const supabase = await getAdminClient();
  if (!supabase) return { company: null as never, jobs: [], error: "Unable to load company." };

  const { data: rows, error } = await supabase.from("companies")
    .select("id,name,logo_path,website,industry,location,description,status,created_at,updated_at")
    .eq("id", id)
    .limit(1)
    .overrideTypes<CompanyRow[], { merge: false }>();
  const company = rows?.[0];
  if (error) {
    logFailure("Company detail", error);
    return { company: null as never, jobs: [], error: "Unable to load company." };
  }
  if (!company) return null;

  const jobsResult = await fetchJobsForCompanies([company.id]);
  if (jobsResult.error) {
    logFailure("Company detail jobs", jobsResult.error);
    return { company: null as never, jobs: [], error: "Unable to load company jobs." };
  }
  const applicationsResult = await fetchApplicationCounts(jobsResult.jobs.map((job) => job.id));
  if (applicationsResult.error) {
    logFailure("Company detail application counts", applicationsResult.error);
    return { company: null as never, jobs: [], error: "Unable to load company jobs." };
  }
  const { data: authData } = await supabase.auth.getUser();
  if (authData.user) await logCompanyView(authData.user.id, company.id);

  return {
    company: {
      id: company.id,
      name: company.name,
      website: company.website,
      industry: company.industry,
      location: company.location,
      description: company.description,
      status: company.status,
      created_at: company.created_at,
      updated_at: company.updated_at,
      logo_url: company.logo_path ? supabase.storage.from("company-logos").getPublicUrl(company.logo_path).data.publicUrl : null,
      job_count: jobsResult.jobs.length,
      application_count: jobsResult.jobs.reduce((total, job) => total + (applicationsResult.counts.get(job.id) ?? 0), 0),
    },
    jobs: jobsResult.jobs.map((job) => ({ ...job, application_count: applicationsResult.counts.get(job.id) ?? 0 })),
    error: null,
  };
}

export type AdminCompanyJobRow = RelatedJobRow & { application_count: number };