import "server-only";

import type { Database } from "../../../types/database";
import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CountName = "users" | "activeJobs" | "applications" | "courses" | "companies" | "placements";

export type AdminDashboardData = {
  counts: Record<CountName, number>;
  recentActivity: Array<Pick<Database["public"]["Tables"]["admin_activity_logs"]["Row"], "id" | "action" | "entity_type" | "created_at">>;
  recentApplications: Array<{
    id: string;
    candidateName: string;
    candidateEmail: string | null;
    jobTitle: string;
    companyName: string;
    status: Database["public"]["Tables"]["applications"]["Row"]["status"];
    createdAt: string;
  }>;
  recentJobs: Array<{
    id: string;
    title: string;
    companyName: string;
    status: Database["public"]["Tables"]["jobs"]["Row"]["status"];
    createdAt: string;
  }>;
  error: string | null;
};

const emptyCounts: AdminDashboardData["counts"] = {
  users: 0,
  activeJobs: 0,
  applications: 0,
  courses: 0,
  companies: 0,
  placements: 0,
};

function emptyDashboard(error: string | null): AdminDashboardData {
  return { counts: { ...emptyCounts }, recentActivity: [], recentApplications: [], recentJobs: [], error };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  if (!(await isCurrentUserAdmin())) return emptyDashboard("Unable to load admin dashboard.");

  const supabase = await createSupabaseServerClient();
  if (!supabase) return emptyDashboard("Unable to load admin dashboard.");

  const today = new Date().toISOString().slice(0, 10);
  const [users, activeJobs, applications, courses, companies, placements, activityResult, applicationsResult, jobsResult] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("jobs").select("id", { count: "exact", head: true })
      .eq("status", "published").gt("vacancies", 0).or(`application_deadline.is.null,application_deadline.gte.${today}`),
    supabase.from("applications").select("id", { count: "exact", head: true }),
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("placements").select("id", { count: "exact", head: true }),
    supabase.from("admin_activity_logs")
      .select("id,action,entity_type,created_at")
      .order("created_at", { ascending: false })
      .limit(8)
      .overrideTypes<AdminDashboardData["recentActivity"], { merge: false }>(),
    supabase.from("applications")
      .select("id,user_id,job_id,status,created_at")
      .order("created_at", { ascending: false })
      .limit(8)
      .overrideTypes<Array<{ id: string; user_id: string; job_id: string; status: Database["public"]["Tables"]["applications"]["Row"]["status"]; created_at: string }>, { merge: false }>(),
    supabase.from("jobs")
      .select("id,title,company_id,status,created_at")
      .order("created_at", { ascending: false })
      .limit(8)
      .overrideTypes<Array<{ id: string; title: string; company_id: string; status: Database["public"]["Tables"]["jobs"]["Row"]["status"]; created_at: string }>, { merge: false }>(),
  ]);

  const queryErrors = [users.error, activeJobs.error, applications.error, courses.error, companies.error, placements.error, activityResult.error, applicationsResult.error, jobsResult.error]
    .filter((error): error is NonNullable<typeof error> => Boolean(error));
  if (queryErrors.length) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[admin-dashboard] Data query failed", queryErrors.map(({ message, code }) => ({ message, code })));
    }
    return emptyDashboard("Unable to load admin dashboard.");
  }

  const applicationRows = applicationsResult.data ?? [];
  const recentJobs = jobsResult.data ?? [];
  const profileIds = [...new Set(applicationRows.map((application) => application.user_id))];
  const relatedJobIds = [...new Set(applicationRows.map((application) => application.job_id))];
  const companyIds = [...new Set([...recentJobs.map((job) => job.company_id)])];

  const [profilesResult, relatedJobsResult] = await Promise.all([
    supabase.from("profiles")
      .select("id,full_name,email")
      .in("id", profileIds)
      .overrideTypes<Array<{ id: string; full_name: string; email: string | null }>, { merge: false }>(),
    supabase.from("jobs")
      .select("id,title,company_id")
      .in("id", relatedJobIds)
      .overrideTypes<Array<{ id: string; title: string; company_id: string }>, { merge: false }>(),
  ]);

  if (profilesResult.error || relatedJobsResult.error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[admin-dashboard] Recent record lookup failed", {
        profiles: profilesResult.error?.message ?? null,
        jobs: relatedJobsResult.error?.message ?? null,
      });
    }
    return emptyDashboard("Unable to load admin dashboard.");
  }

  const allCompanyIds = [...new Set([
    ...companyIds,
    ...(relatedJobsResult.data ?? []).map((job) => job.company_id),
  ])];
  const companyResult = await supabase.from("companies")
    .select("id,name")
    .in("id", allCompanyIds)
    .overrideTypes<Array<{ id: string; name: string }>, { merge: false }>();

  if (companyResult.error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-dashboard] Company lookup failed", companyResult.error.message);
    return emptyDashboard("Unable to load admin dashboard.");
  }

  const profileMap = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const jobMap = new Map((relatedJobsResult.data ?? []).map((job) => [job.id, job]));
  const companyMap = new Map((companyResult.data ?? []).map((company) => [company.id, company.name]));

  return {
    counts: {
      users: users.count ?? 0,
      activeJobs: activeJobs.count ?? 0,
      applications: applications.count ?? 0,
      courses: courses.count ?? 0,
      companies: companies.count ?? 0,
      placements: placements.count ?? 0,
    },
    recentActivity: activityResult.data ?? [],
    recentApplications: applicationRows.map((application) => {
      const profile = profileMap.get(application.user_id);
      const job = jobMap.get(application.job_id);
      return {
        id: application.id,
        candidateName: profile?.full_name?.trim() || "SynSphere user",
        candidateEmail: profile?.email ?? null,
        jobTitle: job?.title ?? "Role unavailable",
        companyName: job ? companyMap.get(job.company_id) ?? "Company" : "Company",
        status: application.status,
        createdAt: application.created_at,
      };
    }),
    recentJobs: recentJobs.map((job) => ({
      id: job.id,
      title: job.title,
      companyName: companyMap.get(job.company_id) ?? "Company",
      status: job.status,
      createdAt: job.created_at,
    })),
    error: null,
  };
}