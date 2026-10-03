import "server-only";

import type { Database } from "../../../types/database";
import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ADMIN_USER_PAGE_SIZE = 25;

export type AdminUserListRow = {
  id: string;
  full_name: string;
  email: string | null;
  mobile: string | null;
  created_at: string;
  role: "user" | "admin" | "unassigned";
  resume_available: boolean;
  application_count: number;
};

export type AdminUserListFilters = {
  search?: string;
  role?: string;
  resume?: string;
  applications?: string;
  page?: number;
};

export type AdminUserListData = {
  users: AdminUserListRow[];
  total: number;
  page: number;
  error: string | null;
};

export type AdminUserDetail = {
  id: string;
  full_name: string;
  email: string | null;
  mobile: string | null;
  address: string | null;
  skills: string[];
  education: Database["public"]["Tables"]["profiles"]["Row"]["education"];
  experience: Database["public"]["Tables"]["profiles"]["Row"]["experience"];
  created_at: string;
  role: "user" | "admin" | "unassigned";
  profile_image_url: string | null;
  resume: { available: boolean; file_name: string | null; mime_type: string | null };
  applications: Array<{
    id: string;
    job_title: string;
    company_name: string;
    status: Database["public"]["Enums"]["application_status"];
    created_at: string;
  }>;
  enrollments: Array<{
    id: string;
    course_title: string;
    enrolled_at: string;
    status: Database["public"]["Enums"]["enrollment_status"];
  }>;
  placementAssociation: "unavailable";
};

const emptyList = (page: number, error: string | null): AdminUserListData => ({ users: [], total: 0, page, error });
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizedSearch(value?: string) {
  return (value ?? "").trim().slice(0, 100).replace(/[\\%_*]/g, " ").replace(/\s+/g, " ").trim();
}

function logReadFailure(label: string, error: { code?: string; message?: string } | null) {
  if (error && process.env.NODE_ENV !== "production") {
    console.error(`[admin-users] ${label} failed`, { code: error.code ?? null, message: error.message ?? null });
  }
}

export async function getAdminUsers(filters: AdminUserListFilters = {}): Promise<AdminUserListData> {
  const page = Number.isSafeInteger(filters.page) && (filters.page ?? 0) >= 0 ? Math.min(filters.page ?? 0, 10000) : 0;
  if (!(await isCurrentUserAdmin())) return emptyList(page, "Unable to load users.");
  const supabase = await createSupabaseServerClient();
  if (!supabase) return emptyList(page, "Unable to load users.");

  let adminUserIds: string[] = [];
  let normalUserIds: string[] = [];
  if (filters.role === "admin" || filters.role === "user") {
    const { data: roleRows, error } = await supabase.from("user_roles")
      .select("user_id,role")
      .in("role", ["user", "admin"])
      .limit(10000)
      .overrideTypes<Array<{ user_id: string; role: "user" | "admin" }>, { merge: false }>();
    if (error) {
      logReadFailure("Role filter", error);
      return emptyList(page, "Unable to load users.");
    }
    const allRoleRows = roleRows ?? [];
    adminUserIds = [...new Set(allRoleRows.filter((row) => row.role === "admin").map((row) => row.user_id))];
    normalUserIds = [...new Set(allRoleRows.filter((row) => row.role === "user" && !adminUserIds.includes(row.user_id)).map((row) => row.user_id))];
  }

  const search = normalizedSearch(filters.search);
  let query = supabase.from("profiles")
    .select("id,full_name,email,mobile,resume_path,created_at,application_rows:applications(id),resume_rows:user_documents!left(id,file_path,document_type)", { count: "exact" })
    .eq("resume_rows.document_type", "resume");

  if (search) {
    const pattern = `%${search}%`;
    const [nameRows, emailRows, mobileRows] = await Promise.all([
      supabase.from("profiles").select("id").ilike("full_name", pattern).limit(10000).overrideTypes<Array<{ id: string }>, { merge: false }>(),
      supabase.from("profiles").select("id").ilike("email", pattern).limit(10000).overrideTypes<Array<{ id: string }>, { merge: false }>(),
      supabase.from("profiles").select("id").ilike("mobile", pattern).limit(10000).overrideTypes<Array<{ id: string }>, { merge: false }>(),
    ]);
    if (nameRows.error || emailRows.error || mobileRows.error) {
      logReadFailure("User search", nameRows.error ?? emailRows.error ?? mobileRows.error);
      return emptyList(page, "Unable to search users.");
    }
    const matchedIds = [...new Set([...(nameRows.data ?? []), ...(emailRows.data ?? []), ...(mobileRows.data ?? [])].map((row) => row.id))];
    if (!matchedIds.length) return emptyList(page, null);
    query = query.in("id", matchedIds);
  }
  if (filters.role === "admin") {
    if (!adminUserIds.length) return emptyList(page, null);
    query = query.in("id", adminUserIds);
  } else if (filters.role === "user") {
    if (!normalUserIds.length) return emptyList(page, null);
    query = query.in("id", normalUserIds);
  }

  if (filters.resume === "uploaded") query = query.not("resume_rows.id", "is", null);
  if (filters.resume === "missing") query = query.is("resume_rows.id", null);
  if (filters.applications === "has") query = query.not("application_rows.id", "is", null);
  if (filters.applications === "none") query = query.is("application_rows.id", null);

  const start = page * ADMIN_USER_PAGE_SIZE;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(start, start + ADMIN_USER_PAGE_SIZE - 1)
    .overrideTypes<Array<{
      id: string;
      full_name: string;
      email: string | null;
      mobile: string | null;
      created_at: string;
      resume_path: string | null;
      application_rows: Array<{ id: string }>;
      resume_rows: Array<{ id: string; file_path: string; document_type: "resume" | "profile_image" | "portfolio" | "other" }>;
    }>, { merge: false }>();

  if (error) {
    logReadFailure("User list query", error);
    return emptyList(page, "Unable to load users.");
  }

  const userIds = (data ?? []).map((profile) => profile.id);
  const roleResult = userIds.length
    ? await supabase.from("user_roles")
      .select("user_id,role")
      .in("user_id", userIds)
      .overrideTypes<Array<{ user_id: string; role: "user" | "admin" }>, { merge: false }>()
    : { data: [], error: null };
  if (roleResult.error) {
    logReadFailure("Page role lookup", roleResult.error);
    return emptyList(page, "Unable to load users.");
  }
  const effectiveRoles = new Map<string, "user" | "admin">();
  for (const row of roleResult.data ?? []) {
    if (row.role === "admin" || !effectiveRoles.has(row.user_id)) effectiveRoles.set(row.user_id, row.role);
  }

  return {
    users: (data ?? []).map((profile) => ({
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      mobile: profile.mobile,
      created_at: profile.created_at,
      role: effectiveRoles.get(profile.id) ?? "user",
      resume_available: Boolean(profile.resume_path && profile.resume_rows?.some((document) => document.document_type === "resume" && document.file_path === profile.resume_path)),
      application_count: profile.application_rows?.length ?? 0,
    })),
    total: count ?? 0,
    page,
    error: null,
  };
}

async function recordUserViewed(adminUserId: string, profileId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  const { error } = await supabase.from("admin_activity_logs").insert({
    admin_user_id: adminUserId,
    action: "user_viewed",
    entity_type: "profile",
    entity_id: profileId,
    metadata: {},
  });
  if (error) logReadFailure("User view audit", error);
}

export async function getAdminUserDetail(profileId: string): Promise<{ data: AdminUserDetail | null; error: string | null }> {
  if (!uuidPattern.test(profileId) || !(await isCurrentUserAdmin())) return { data: null, error: null };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { data: null, error: "Unable to load user." };

  const { data: profiles, error: profileError } = await supabase.from("profiles")
    .select("id,full_name,email,mobile,address,skills,education,experience,created_at,resume_path,profile_image_path")
    .eq("id", profileId)
    .limit(1)
    .overrideTypes<Array<Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email" | "mobile" | "address" | "skills" | "education" | "experience" | "created_at" | "resume_path" | "profile_image_path">>, { merge: false }>();
  if (profileError) {
    logReadFailure("User detail profile query", profileError);
    return { data: null, error: "Unable to load user." };
  }
  const profile = profiles?.[0];
  if (!profile) return { data: null, error: null };

  const [rolesResult, applicationsResult, enrollmentsResult, documentsResult] = await Promise.all([
    supabase.from("user_roles")
      .select("role")
      .eq("user_id", profileId)
      .overrideTypes<Array<{ role: "user" | "admin" }>, { merge: false }>(),
    supabase.from("applications")
      .select("id,job_id,status,created_at")
      .eq("user_id", profileId)
      .order("created_at", { ascending: false })
      .limit(100)
      .overrideTypes<Array<{ id: string; job_id: string; status: Database["public"]["Enums"]["application_status"]; created_at: string }>, { merge: false }>(),
    supabase.from("course_enrollments")
      .select("id,course_id,status,enrolled_at")
      .eq("user_id", profileId)
      .order("enrolled_at", { ascending: false })
      .limit(100)
      .overrideTypes<Array<{ id: string; course_id: string; status: Database["public"]["Enums"]["enrollment_status"]; enrolled_at: string }>, { merge: false }>(),
    profile.resume_path
      ? supabase.from("user_documents")
        .select("file_name,mime_type,created_at")
        .eq("user_id", profileId)
        .eq("document_type", "resume")
        .eq("file_path", profile.resume_path)
        .limit(1)
        .overrideTypes<Array<{ file_name: string; mime_type: string; created_at: string }>, { merge: false }>()
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (rolesResult.error || applicationsResult.error || enrollmentsResult.error || documentsResult.error) {
    logReadFailure("User detail related query", rolesResult.error ?? applicationsResult.error ?? enrollmentsResult.error ?? documentsResult.error);
    return { data: null, error: "Unable to load user details." };
  }

  const applications = applicationsResult.data ?? [];
  const enrollments = enrollmentsResult.data ?? [];
  const jobIds = [...new Set(applications.map((application) => application.job_id))];
  const courseIds = [...new Set(enrollments.map((enrollment) => enrollment.course_id))];
  const [jobsResult, coursesResult] = await Promise.all([
    jobIds.length
      ? supabase.from("jobs")
        .select("id,title,company_id,company:companies!jobs_company_id_fkey(name)")
        .in("id", jobIds)
        .overrideTypes<Array<{ id: string; title: string; company_id: string; company: { name: string } | null }>, { merge: false }>()
      : Promise.resolve({ data: [], error: null }),
    courseIds.length
      ? supabase.from("courses")
        .select("id,title")
        .in("id", courseIds)
        .overrideTypes<Array<{ id: string; title: string }>, { merge: false }>()
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (jobsResult.error || coursesResult.error) {
    logReadFailure("User detail job/course lookup", jobsResult.error ?? coursesResult.error);
    return { data: null, error: "Unable to load user details." };
  }

  let profileImageUrl: string | null = null;
  if (profile.profile_image_path) {
    const { data } = await supabase.storage.from("profile-images").createSignedUrl(profile.profile_image_path, 60);
    profileImageUrl = data?.signedUrl ?? null;
  }
  const latestResume = documentsResult.data?.[0];
  const jobMap = new Map((jobsResult.data ?? []).map((job) => [job.id, job]));
  const courseMap = new Map((coursesResult.data ?? []).map((course) => [course.id, course.title]));
  const { data: authData } = await supabase.auth.getUser();
  if (authData.user) await recordUserViewed(authData.user.id, profileId);

  return {
    data: {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      mobile: profile.mobile,
      address: profile.address,
      skills: profile.skills,
      education: profile.education,
      experience: profile.experience,
      created_at: profile.created_at,
      role: (rolesResult.data ?? []).some((row) => row.role === "admin") ? "admin" : (rolesResult.data ?? []).some((row) => row.role === "user") ? "user" : "unassigned",
      profile_image_url: profileImageUrl,
      resume: { available: Boolean(latestResume), file_name: latestResume?.file_name ?? null, mime_type: latestResume?.mime_type ?? null },
      applications: applications.map((application) => {
        const job = jobMap.get(application.job_id);
        return {
          id: application.id,
          job_title: job?.title ?? "Role unavailable",
          company_name: job?.company?.name ?? "Company",
          status: application.status,
          created_at: application.created_at,
        };
      }),
      enrollments: enrollments.map((enrollment) => ({
        id: enrollment.id,
        course_title: courseMap.get(enrollment.course_id) ?? "Course unavailable",
        enrolled_at: enrollment.enrolled_at,
        status: enrollment.status,
      })),
      placementAssociation: "unavailable",
    },
    error: null,
  };
}

export async function getAdminUserResume(profileId: string): Promise<{ url: string; fileName: string } | { error: string }> {
  if (!uuidPattern.test(profileId) || !(await isCurrentUserAdmin())) return { error: "Resume access is unavailable." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Resume access is unavailable." };

  const { data: profiles, error: profileError } = await supabase.from("profiles")
    .select("resume_path")
    .eq("id", profileId)
    .limit(1)
    .overrideTypes<Array<{ resume_path: string | null }>, { merge: false }>();
  const path = profiles?.[0]?.resume_path;
  if (profileError || !path || !path.startsWith(`${profileId}/`)) return { error: "No resume is available for this user." };

  const { data: documents, error: documentError } = await supabase.from("user_documents")
    .select("file_path,file_name")
    .eq("user_id", profileId)
    .eq("document_type", "resume")
    .eq("file_path", path)
    .limit(1)
    .overrideTypes<Array<{ file_path: string; file_name: string }>, { merge: false }>();
  const document = documents?.[0];
  if (documentError || !document) return { error: "No resume is available for this user." };

  const { data, error } = await supabase.storage.from("resumes").createSignedUrl(document.file_path, 60);
  if (error || !data?.signedUrl) {
    if (error && process.env.NODE_ENV !== "production") console.error("[admin-users] Signed resume link failed", { code: error.statusCode, message: error.message });
    return { error: "The resume could not be opened." };
  }
  return { url: data.signedUrl, fileName: document.file_name };
}