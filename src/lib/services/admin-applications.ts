import "server-only";

import type { Database } from "../../../types/database";
import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const APPLICATION_STATUSES = [
  "applied",
  "under_review",
  "shortlisted",
  "interview",
  "selected",
  "rejected",
] as const satisfies readonly Database["public"]["Enums"]["application_status"][];

export type AdminApplicationStatus = typeof APPLICATION_STATUSES[number];
export const ADMIN_APPLICATION_PAGE_SIZE = 25;

export type AdminApplicationListRow = {
  id: string;
  user_id: string;
  job_id: string;
  status: AdminApplicationStatus;
  created_at: string;
  applicant_name: string;
  applicant_email: string | null;
  applicant_mobile: string | null;
  job_title: string;
  company_id: string;
  company_name: string;
  location: string;
};

export type AdminApplicationListData = {
  applications: AdminApplicationListRow[];
  companies: Array<{ id: string; name: string }>;
  jobs: Array<{ id: string; title: string; company_id: string }>;
  total: number;
  page: number;
  error: string | null;
};

export type AdminApplicationDetail = {
  id: string;
  status: AdminApplicationStatus;
  created_at: string;
  applicant: {
    full_name: string;
    email: string | null;
    mobile: string | null;
    address: string | null;
    skills: string[];
    education: Database["public"]["Tables"]["profiles"]["Row"]["education"];
    experience: Database["public"]["Tables"]["profiles"]["Row"]["experience"];
  };
  job: {
    id: string;
    title: string;
    location: string;
    job_type: string;
    description: string;
    requirements: string[];
    responsibilities: string[];
    company_name: string;
    company_location: string | null;
  };
  resume: { available: boolean; file_name: string | null; mime_type: string | null };
};

export type AdminApplicationFilters = {
  search?: string;
  status?: string;
  jobId?: string;
  companyId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
};

type AppFilterIds = { userIds: string[]; jobIds: string[] };
const noMatchUuid = "00000000-0000-0000-0000-000000000000";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function emptyList(page: number, error: string | null): AdminApplicationListData {
  return { applications: [], companies: [], jobs: [], total: 0, page, error };
}

function validDate(value?: string) {
  if (!value || !datePattern.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}

async function getSearchIds(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>, term: string): Promise<AppFilterIds | null> {
  const pattern = `%${term}%`;
  const [nameResult, emailResult, titleResult, companyResult] = await Promise.all([
    supabase.from("profiles").select("id").ilike("full_name", pattern).limit(500).overrideTypes<Array<{ id: string }>, { merge: false }>(),
    supabase.from("profiles").select("id").ilike("email", pattern).limit(500).overrideTypes<Array<{ id: string }>, { merge: false }>(),
    supabase.from("jobs").select("id").ilike("title", pattern).limit(500).overrideTypes<Array<{ id: string }>, { merge: false }>(),
    supabase.from("companies").select("id").ilike("name", pattern).limit(250).overrideTypes<Array<{ id: string }>, { merge: false }>(),
  ]);

  if (nameResult.error || emailResult.error || titleResult.error || companyResult.error) return null;
  const companyIds = [...new Set((companyResult.data ?? []).map((company) => company.id))];
  const companyJobResult = companyIds.length
    ? await supabase.from("jobs").select("id").in("company_id", companyIds).limit(1000).overrideTypes<Array<{ id: string }>, { merge: false }>()
    : { data: [], error: null };
  if (companyJobResult.error) return null;

  return {
    userIds: [...new Set([...(nameResult.data ?? []), ...(emailResult.data ?? [])].map((profile) => profile.id))],
    jobIds: [...new Set([...(titleResult.data ?? []), ...(companyJobResult.data ?? [])].map((job) => job.id))],
  };
}

async function getJobsForCompany(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>, companyId: string) {
  return supabase.from("jobs")
    .select("id")
    .eq("company_id", companyId)
    .limit(1000)
    .overrideTypes<Array<{ id: string }>, { merge: false }>();
}

export async function getAdminApplications(filters: AdminApplicationFilters = {}): Promise<AdminApplicationListData> {
  const safePage = Number.isSafeInteger(filters.page) && (filters.page ?? 0) >= 0 ? Math.min(filters.page ?? 0, 10000) : 0;
  if (!(await isCurrentUserAdmin())) return emptyList(safePage, "Unable to load applications.");

  const supabase = await createSupabaseServerClient();
  if (!supabase) return emptyList(safePage, "Unable to load applications.");

  const [companyResult, jobsOptionsResult] = await Promise.all([
    supabase.from("companies").select("id,name").order("name").limit(1000).overrideTypes<Array<{ id: string; name: string }>, { merge: false }>(),
    supabase.from("jobs").select("id,title,company_id").order("created_at", { ascending: false }).limit(1000).overrideTypes<Array<{ id: string; title: string; company_id: string }>, { merge: false }>(),
  ]);
  if (companyResult.error || jobsOptionsResult.error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-applications] Filter options failed", {
      companies: companyResult.error?.message ?? null,
      jobs: jobsOptionsResult.error?.message ?? null,
    });
    return emptyList(safePage, "Unable to load applications.");
  }

  const companyId = filters.companyId && uuidPattern.test(filters.companyId) ? filters.companyId : null;
  const jobId = filters.jobId && uuidPattern.test(filters.jobId) ? filters.jobId : null;
  let companyJobIds: string[] | null = null;
  if (companyId) {
    const jobsResult = await getJobsForCompany(supabase, companyId);
    if (jobsResult.error) return emptyList(safePage, "Unable to load applications.");
    companyJobIds = (jobsResult.data ?? []).map((job) => job.id);
    if (!companyJobIds.length) return { ...emptyList(safePage, null), companies: companyResult.data ?? [], jobs: jobsOptionsResult.data ?? [] };
  }

  const term = filters.search?.trim().slice(0, 100) ?? "";
  const searchIds = term ? await getSearchIds(supabase, term) : null;
  if (term && !searchIds) return emptyList(safePage, "Unable to search applications.");

  let query = supabase.from("applications")
    .select("id,user_id,job_id,status,created_at,profile:profiles!applications_user_id_fkey(full_name,email,mobile),job:jobs!applications_job_id_fkey(title,location,company_id,company:companies!jobs_company_id_fkey(name))", { count: "exact" });

  if (filters.status && APPLICATION_STATUSES.includes(filters.status as AdminApplicationStatus)) query = query.eq("status", filters.status as AdminApplicationStatus);
  if (jobId) query = query.eq("job_id", jobId);
  if (companyJobIds) query = query.in("job_id", companyJobIds);
  const from = validDate(filters.dateFrom);
  const to = validDate(filters.dateTo);
  if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);

  if (term && searchIds) {
    if (!searchIds.userIds.length && !searchIds.jobIds.length) query = query.eq("id", noMatchUuid);
    else if (searchIds.userIds.length && searchIds.jobIds.length) {
      query = query.or(`user_id.in.(${searchIds.userIds.join(",")}),job_id.in.(${searchIds.jobIds.join(",")})`);
    } else if (searchIds.userIds.length) query = query.in("user_id", searchIds.userIds);
    else query = query.in("job_id", searchIds.jobIds);
  }

  const start = safePage * ADMIN_APPLICATION_PAGE_SIZE;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(start, start + ADMIN_APPLICATION_PAGE_SIZE - 1)
    .overrideTypes<Array<{
      id: string;
      user_id: string;
      job_id: string;
      status: AdminApplicationStatus;
      created_at: string;
      profile: { full_name: string; email: string | null; mobile: string | null } | null;
      job: { title: string; location: string; company_id: string; company: { name: string } | null } | null;
    }>, { merge: false }>();

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-applications] List query failed", { code: error.code, message: error.message, details: error.details, hint: error.hint });
    return emptyList(safePage, "Unable to load applications.");
  }

  return {
    applications: (data ?? []).map((application) => ({
      id: application.id,
      user_id: application.user_id,
      job_id: application.job_id,
      status: application.status,
      created_at: application.created_at,
      applicant_name: application.profile?.full_name?.trim() || "SynSphere user",
      applicant_email: application.profile?.email ?? null,
      applicant_mobile: application.profile?.mobile ?? null,
      job_title: application.job?.title ?? "Role unavailable",
      company_id: application.job?.company_id ?? "",
      company_name: application.job?.company?.name ?? "Company",
      location: application.job?.location ?? "",
    })),
    companies: companyResult.data ?? [],
    jobs: jobsOptionsResult.data ?? [],
    total: count ?? 0,
    page: safePage,
    error: null,
  };
}

async function insertAdminActivity(adminUserId: string, action: string, applicationId: string, metadata: Database["public"]["Tables"]["admin_activity_logs"]["Insert"]["metadata"]) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  const { error } = await supabase.from("admin_activity_logs").insert({
    admin_user_id: adminUserId,
    action,
    entity_type: "application",
    entity_id: applicationId,
    metadata,
  });
  if (error && process.env.NODE_ENV !== "production") console.error("[admin-applications] Audit insert failed", { action, applicationId, code: error.code, message: error.message });
}

export async function getAdminApplicationDetail(id: string): Promise<{ data: AdminApplicationDetail | null; error: string | null }> {
  if (!uuidPattern.test(id) || !(await isCurrentUserAdmin())) return { data: null, error: null };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { data: null, error: "Unable to load application." };

  const { data: applications, error: applicationError } = await supabase.from("applications")
    .select("id,user_id,job_id,resume_path,status,created_at")
    .eq("id", id)
    .limit(1)
    .overrideTypes<Array<{ id: string; user_id: string; job_id: string; resume_path: string | null; status: AdminApplicationStatus; created_at: string }>, { merge: false }>();
  if (applicationError) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-applications] Detail query failed", { code: applicationError.code, message: applicationError.message });
    return { data: null, error: "Unable to load application." };
  }
  const application = applications?.[0];
  if (!application) return { data: null, error: null };

  const [profileResult, jobResult] = await Promise.all([
    supabase.from("profiles")
      .select("full_name,email,mobile,address,skills,education,experience")
      .eq("id", application.user_id)
      .limit(1)
      .overrideTypes<Array<AdminApplicationDetail["applicant"]>, { merge: false }>(),
    supabase.from("jobs")
      .select("id,title,location,job_type,description,requirements,responsibilities,company_id")
      .eq("id", application.job_id)
      .limit(1)
      .overrideTypes<Array<{ id: string; title: string; location: string; job_type: string; description: string; requirements: string[]; responsibilities: string[]; company_id: string }>, { merge: false }>(),
  ]);
  if (profileResult.error || jobResult.error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-applications] Detail relation query failed", {
      profile: profileResult.error?.message ?? null,
      job: jobResult.error?.message ?? null,
    });
    return { data: null, error: "Unable to load application." };
  }
  const profile = profileResult.data?.[0];
  const job = jobResult.data?.[0];
  if (!profile || !job) return { data: null, error: null };

  const [{ data: companies, error: companyError }, resumeResult] = await Promise.all([
    supabase.from("companies")
      .select("name,location")
      .eq("id", job.company_id)
      .limit(1)
      .overrideTypes<Array<{ name: string; location: string | null }>, { merge: false }>(),
    application.resume_path
      ? supabase.from("user_documents")
        .select("file_name,mime_type")
        .eq("user_id", application.user_id)
        .eq("document_type", "resume")
        .eq("file_path", application.resume_path)
        .limit(1)
        .overrideTypes<Array<{ file_name: string; mime_type: string }>, { merge: false }>()
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (companyError || resumeResult.error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-applications] Company/resume metadata query failed", {
      company: companyError?.message ?? null,
      resume: resumeResult.error?.message ?? null,
    });
    return { data: null, error: "Unable to load application." };
  }

  const resume = resumeResult.data?.[0];
  const detail: AdminApplicationDetail = {
    id: application.id,
    status: application.status,
    created_at: application.created_at,
    applicant: profile,
    job: {
      id: job.id,
      title: job.title,
      location: job.location,
      job_type: job.job_type,
      description: job.description,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
      company_name: companies?.[0]?.name ?? "Company",
      company_location: companies?.[0]?.location ?? null,
    },
    resume: { available: Boolean(resume), file_name: resume?.file_name ?? null, mime_type: resume?.mime_type ?? null },
  };

  const { data: authData } = await supabase.auth.getUser();
  if (authData.user) await insertAdminActivity(authData.user.id, "application_viewed", application.id, {});
  return { data: detail, error: null };
}

export async function getAdminApplicationResume(applicationId: string): Promise<{ url: string; fileName: string } | { error: string }> {
  if (!uuidPattern.test(applicationId) || !(await isCurrentUserAdmin())) return { error: "Resume access is unavailable." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Resume access is unavailable." };

  const { data: rows, error: applicationError } = await supabase.from("applications")
    .select("id,user_id,resume_path")
    .eq("id", applicationId)
    .limit(1)
    .overrideTypes<Array<{ id: string; user_id: string; resume_path: string | null }>, { merge: false }>();
  const application = rows?.[0];
  if (applicationError || !application?.resume_path || !application.resume_path.startsWith(`${application.user_id}/`)) {
    return { error: "No resume is available for this application." };
  }

  const { data: documents, error: documentError } = await supabase.from("user_documents")
    .select("file_path,file_name")
    .eq("user_id", application.user_id)
    .eq("document_type", "resume")
    .eq("file_path", application.resume_path)
    .limit(1)
    .overrideTypes<Array<{ file_path: string; file_name: string }>, { merge: false }>();
  const document = documents?.[0];
  if (documentError || !document) return { error: "No resume is available for this application." };

  const { data, error } = await supabase.storage.from("resumes").createSignedUrl(document.file_path, 60);
  if (error || !data?.signedUrl) {
    if (error && process.env.NODE_ENV !== "production") console.error("[admin-applications] Signed resume URL failed", { code: error.statusCode, message: error.message });
    return { error: "The resume could not be opened." };
  }
  const { data: authData } = await supabase.auth.getUser();
  if (authData.user) await insertAdminActivity(authData.user.id, "application_resume_accessed", application.id, {});
  return { url: data.signedUrl, fileName: document.file_name };
}