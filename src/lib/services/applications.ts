import "server-only";

import type { Database } from "../../../types/database";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dataResult, SUPABASE_NOT_CONFIGURED, type DataResult } from "./result";

export type ApplicationSummary = Pick<Database["public"]["Tables"]["applications"]["Row"],
  "id" | "user_id" | "job_id" | "resume_path" | "status" | "interview_date" | "created_at" | "updated_at"
>;

export type MyApplication = ApplicationSummary & {
  jobTitle: string;
  companyName: string;
  location: string;
};

export type ApplicationReview = {
  existingApplicationId: string | null;
  fullName: string;
  email: string;
  mobile: string | null;
  resumePath: string | null;
  resumeFileName: string | null;
};

export type SubmitApplicationResult =
  | { kind: "success"; application: ApplicationSummary }
  | { kind: "duplicate"; applicationId: string | null }
  | { kind: "profile-incomplete" }
  | { kind: "resume-missing" }
  | { kind: "job-unavailable" }
  | { kind: "unauthenticated" }
  | { kind: "error" };

const applicationColumns = "id,user_id,job_id,resume_path,status,interview_date,created_at,updated_at";

export async function getMyApplications(): Promise<DataResult<MyApplication[]>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return dataResult([], "demo", SUPABASE_NOT_CONFIGURED);

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return dataResult([], "supabase", "Sign in to view your applications.");

  const { data, error } = await supabase.from("applications")
    .select(applicationColumns)
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false })
    .limit(50)
    .overrideTypes<ApplicationSummary[], { merge: false }>();

  if (error) return dataResult([], "supabase", "Your applications are temporarily unavailable.");
  const applications = data ?? [];
  const jobIds = [...new Set(applications.map((application) => application.job_id))];
  if (!jobIds.length) return dataResult([], "supabase");

  const { data: jobs, error: jobsError } = await supabase.from("jobs")
    .select("id,title,company_id,location")
    .in("id", jobIds)
    .overrideTypes<Array<{ id: string; title: string; company_id: string; location: string }>, { merge: false }>();

  if (jobsError) return dataResult([], "supabase", "Your applications are temporarily unavailable.");
  const companyIds = [...new Set((jobs ?? []).map((job) => job.company_id))];
  const { data: companies, error: companiesError } = companyIds.length
    ? await supabase.from("companies")
      .select("id,name")
      .in("id", companyIds)
      .overrideTypes<Array<{ id: string; name: string }>, { merge: false }>()
    : { data: [], error: null };

  if (companiesError) return dataResult([], "supabase", "Your applications are temporarily unavailable.");
  const jobMap = new Map((jobs ?? []).map((job) => [job.id, job]));
  const companyMap = new Map((companies ?? []).map((company) => [company.id, company.name]));
  return dataResult(applications.map((application) => {
    const job = jobMap.get(application.job_id);
    return {
      ...application,
      jobTitle: job?.title ?? "Role no longer available",
      companyName: job ? (companyMap.get(job.company_id) ?? "Company") : "Company",
      location: job?.location ?? "",
    };
  }), "supabase");
}

export async function getMyApplication(id: string): Promise<DataResult<MyApplication | null>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return dataResult(null, "demo", SUPABASE_NOT_CONFIGURED);

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return dataResult(null, "supabase", "Sign in to view this application.");

  const { data: applications, error } = await supabase.from("applications")
    .select(applicationColumns)
    .eq("id", id)
    .eq("user_id", authData.user.id)
    .limit(1)
    .overrideTypes<ApplicationSummary[], { merge: false }>();

  if (error) return dataResult(null, "supabase", "This application is unavailable.");
  const application = applications?.[0];
  if (!application) return dataResult(null, "supabase");

  const { data: jobs, error: jobError } = await supabase.from("jobs")
    .select("id,title,company_id,location")
    .eq("id", application.job_id)
    .limit(1)
    .overrideTypes<Array<{ id: string; title: string; company_id: string; location: string }>, { merge: false }>();
  if (jobError) return dataResult(null, "supabase", "This application is unavailable.");

  const job = jobs?.[0];
  if (!job) return dataResult({ ...application, jobTitle: "Role no longer available", companyName: "Company", location: "" }, "supabase");

  const { data: companies, error: companyError } = await supabase.from("companies")
    .select("name")
    .eq("id", job.company_id)
    .limit(1)
    .overrideTypes<Array<{ name: string }>, { merge: false }>();
  if (companyError) return dataResult(null, "supabase", "This application is unavailable.");

  return dataResult({
    ...application,
    jobTitle: job.title,
    companyName: companies?.[0]?.name ?? "Company",
    location: job.location,
  }, "supabase");
}

export async function getApplicationReview(jobId: string): Promise<DataResult<ApplicationReview | null>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return dataResult(null, "demo", SUPABASE_NOT_CONFIGURED);

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return dataResult(null, "supabase", "Sign in before applying to a role.");

  const [applicationResult, profileResult] = await Promise.all([
    supabase.from("applications")
      .select("id")
      .eq("user_id", authData.user.id)
      .eq("job_id", jobId)
      .limit(1)
      .overrideTypes<Array<{ id: string }>, { merge: false }>(),
    supabase.from("profiles")
      .select("full_name,email,mobile,resume_path")
      .eq("id", authData.user.id)
      .limit(1)
      .overrideTypes<Array<{ full_name: string; email: string | null; mobile: string | null; resume_path: string | null }>, { merge: false }>(),
  ]);

  if (applicationResult.error || profileResult.error) return dataResult(null, "supabase", "Application details are temporarily unavailable.");
  const profile = profileResult.data?.[0];
  if (!profile) return dataResult(null, "supabase", "Complete your profile before applying.");

  let resumeFileName: string | null = null;
  if (profile.resume_path) {
    const { data: documents, error } = await supabase.from("user_documents")
      .select("file_name")
      .eq("user_id", authData.user.id)
      .eq("document_type", "resume")
      .eq("file_path", profile.resume_path)
      .limit(1)
      .overrideTypes<Array<{ file_name: string }>, { merge: false }>();
    if (error) return dataResult(null, "supabase", "Application details are temporarily unavailable.");
    resumeFileName = documents?.[0]?.file_name ?? null;
  }

  return dataResult({
    existingApplicationId: applicationResult.data?.[0]?.id ?? null,
    fullName: profile.full_name,
    email: authData.user.email ?? profile.email ?? "",
    mobile: profile.mobile,
    resumePath: resumeFileName ? profile.resume_path : null,
    resumeFileName,
  }, "supabase");
}

export async function createApplicationForCurrentUser(jobId: string): Promise<SubmitApplicationResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { kind: "error" };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { kind: "unauthenticated" };
  const userId = authData.user.id;

  const { data: existing, error: existingError } = await supabase.from("applications")
    .select("id")
    .eq("user_id", userId)
    .eq("job_id", jobId)
    .limit(1)
    .overrideTypes<Array<{ id: string }>, { merge: false }>();
  if (existingError) return { kind: "error" };
  if (existing?.[0]) return { kind: "duplicate", applicationId: existing[0].id };

  const { data: profiles, error: profileError } = await supabase.from("profiles")
    .select("full_name,email,resume_path,status")
    .eq("id", userId)
    .limit(1)
    .overrideTypes<Array<{ full_name: string; email: string | null; resume_path: string | null; status: "active" | "suspended" }>, { merge: false }>();
  if (profileError) return { kind: "error" };
  const profile = profiles?.[0];
  if (!profile || profile.status !== "active" || !profile.full_name.trim() || !(authData.user.email ?? profile.email)?.trim()) {
    return { kind: "profile-incomplete" };
  }
  if (!profile.resume_path) return { kind: "resume-missing" };

  const { data: documents, error: documentError } = await supabase.from("user_documents")
    .select("file_path")
    .eq("user_id", userId)
    .eq("document_type", "resume")
    .eq("file_path", profile.resume_path)
    .limit(1)
    .overrideTypes<Array<{ file_path: string }>, { merge: false }>();
  if (documentError) return { kind: "error" };
  if (!documents?.[0]) return { kind: "resume-missing" };

  const { data: jobs, error: jobError } = await supabase.from("jobs")
    .select("id,status,vacancies,application_deadline")
    .eq("id", jobId)
    .eq("status", "published")
    .gt("vacancies", 0)
    .limit(1)
    .overrideTypes<Array<{ id: string; status: string; vacancies: number; application_deadline: string | null }>, { merge: false }>();
  const job = jobs?.[0];
  if (jobError) return { kind: "error" };
  if (!job || (job.application_deadline && job.application_deadline < new Date().toISOString().slice(0, 10))) {
    return { kind: "job-unavailable" };
  }

  const { data, error } = await supabase.from("applications")
    .insert({ user_id: userId, job_id: jobId, resume_path: profile.resume_path, status: "applied" })
    .select(applicationColumns)
    .limit(1)
    .overrideTypes<ApplicationSummary[], { merge: false }>();

  if (error?.code === "23505") {
    const { data: racedApplication } = await supabase.from("applications")
      .select("id")
      .eq("user_id", userId)
      .eq("job_id", jobId)
      .limit(1)
      .overrideTypes<Array<{ id: string }>, { merge: false }>();
    return { kind: "duplicate", applicationId: racedApplication?.[0]?.id ?? null };
  }
  if (error || !data?.[0]) return { kind: "error" };
  return { kind: "success", application: data[0] };
}