import "server-only";

import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "../../../types/database";

export const ADMIN_COURSE_PAGE_SIZE = 25;
const COURSE_STATUS_OPTIONS = ["draft", "published", "archived"] as const;

type CourseStatus = Database["public"]["Tables"]["courses"]["Row"]["status"];
type CourseRow = Pick<Database["public"]["Tables"]["courses"]["Row"],
  "id" | "title" | "description" | "category" | "duration" | "price" | "skills" | "level" | "status" | "created_at" | "image_path"
> & {
  curriculum: unknown;
  requirements: unknown;
};
type CourseDetailRow = CourseRow & {
  curriculum: unknown;
  requirements: unknown;
};
type CourseEnrollmentRow = Pick<Database["public"]["Tables"]["course_enrollments"]["Row"], "id" | "user_id" | "status" | "enrolled_at">;

export type AdminCourseRow = Omit<CourseRow, "curriculum" | "requirements"> & {
  curriculum: string[];
  requirements: string[];
  image_url: string | null;
  enrollment_count: number;
};

export type AdminCourseEnrollment = CourseEnrollmentRow & {
  user_name: string | null;
  user_email: string | null;
};

export type AdminCourseDetail = AdminCourseRow;

export type AdminCourseListData = {
  courses: AdminCourseRow[];
  categories: string[];
  total: number;
  page: number;
  error: string | null;
};

function emptyList(page: number, error: string | null): AdminCourseListData {
  return { courses: [], categories: [], total: 0, page, error };
}

function sanitizeStatus(value: string | null | undefined): CourseStatus | "" {
  return value && COURSE_STATUS_OPTIONS.includes(value as CourseStatus) ? (value as CourseStatus) : "";
}

function normalizeTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").filter(Boolean);
}

async function getAdminClient() {
  if (!(await isCurrentUserAdmin())) return null;
  return createSupabaseServerClient();
}

async function fetchEnrollmentCounts(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>, courseIds: string[]) {
  const counts = new Map<string, number>();
  if (!courseIds.length) return counts;

  const { data, error } = await supabase
    .from("course_enrollments")
    .select("course_id")
    .in("course_id", courseIds)
    .overrideTypes<Array<{ course_id: string }>, { merge: false }>();

  if (error) throw error;

  for (const row of data ?? []) {
    counts.set(row.course_id, (counts.get(row.course_id) ?? 0) + 1);
  }

  return counts;
}

async function fetchCategoryValues(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>) {
  const { data, error } = await supabase
    .from("courses")
    .select("category")
    .order("category", { ascending: true })
    .overrideTypes<Array<{ category: string }>, { merge: false }>();

  if (error) return [] as string[];
  return [...new Set((data ?? []).map((row) => row.category).filter(Boolean))];
}

async function searchCourseIds(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>, search: string) {
  const pattern = `%${search}%`;
  const [titleResult, categoryResult, descriptionResult] = await Promise.all([
    supabase.from("courses").select("id").ilike("title", pattern).limit(10000).overrideTypes<Array<{ id: string }>, { merge: false }>(),
    supabase.from("courses").select("id").ilike("category", pattern).limit(10000).overrideTypes<Array<{ id: string }>, { merge: false }>(),
    supabase.from("courses").select("id").ilike("description", pattern).limit(10000).overrideTypes<Array<{ id: string }>, { merge: false }>(),
  ]);

  const error = titleResult.error ?? categoryResult.error ?? descriptionResult.error;
  if (error) return { ids: [] as string[], error };

  const ids = [...new Set([...(titleResult.data ?? []), ...(categoryResult.data ?? []), ...(descriptionResult.data ?? [])].map((row) => row.id))];
  return { ids, error: null };
}

export async function getAdminCourses(filters: { search?: string; status?: string; category?: string; page?: number } = {}): Promise<AdminCourseListData> {
  const page = Number.isSafeInteger(filters.page) && (filters.page ?? 0) >= 0 ? Math.min(filters.page ?? 0, 10000) : 0;
  const supabase = await getAdminClient();
  if (!supabase) return emptyList(page, "Unable to load courses.");

  const search = (filters.search ?? "").trim().slice(0, 100);
  const status = sanitizeStatus(filters.status ?? "");
  const category = (filters.category ?? "").trim().slice(0, 120);

  let courseIds: string[] | null = null;
  if (search) {
    const searchResult = await searchCourseIds(supabase, search);
    if (searchResult.error) return emptyList(page, "Unable to search courses.");
    courseIds = searchResult.ids;
    if (!courseIds.length) return emptyList(page, null);
  }

  let query = supabase
    .from("courses")
    .select("id,title,description,category,duration,price,skills,level,status,created_at,image_path,curriculum,requirements", { count: "exact" });

  if (status) query = query.eq("status", status);
  if (category) query = query.ilike("category", `%${category}%`);
  if (courseIds) query = query.in("id", courseIds);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(page * ADMIN_COURSE_PAGE_SIZE, (page + 1) * ADMIN_COURSE_PAGE_SIZE - 1)
    .overrideTypes<CourseRow[], { merge: false }>();

  if (error) return emptyList(page, "Unable to load courses.");

  const courses = data ?? [];
  const counts = await fetchEnrollmentCounts(supabase, courses.map((course) => course.id)).catch(() => new Map<string, number>());
  const categories = await fetchCategoryValues(supabase);

  return {
    courses: courses.map((course) => ({
      ...course,
      curriculum: normalizeTextList(course.curriculum),
      requirements: normalizeTextList(course.requirements),
      image_url: course.image_path ? supabase.storage.from("course-images").getPublicUrl(course.image_path).data.publicUrl : null,
      enrollment_count: counts.get(course.id) ?? 0,
    })),
    categories,
    total: count ?? 0,
    page,
    error: null,
  };
}

export async function getAdminCourse(id: string): Promise<{ course: AdminCourseDetail | null; enrollments: AdminCourseEnrollment[]; error: string | null }> {
  const supabase = await getAdminClient();
  if (!supabase) return { course: null, enrollments: [], error: "Unable to load course." };

  const { data, error } = await supabase
    .from("courses")
    .select("id,title,description,category,duration,price,skills,level,status,created_at,image_path,curriculum,requirements")
    .eq("id", id)
    .limit(1)
    .overrideTypes<CourseDetailRow[], { merge: false }>();

  if (error) return { course: null, enrollments: [], error: "Unable to load course." };
  const row = data?.[0];
  if (!row) return { course: null, enrollments: [], error: null };

  const { data: enrollmentRows, error: enrollmentError } = await supabase
    .from("course_enrollments")
    .select("id,user_id,status,enrolled_at")
    .eq("course_id", id)
    .order("enrolled_at", { ascending: false })
    .overrideTypes<CourseEnrollmentRow[], { merge: false }>();

  if (enrollmentError) return { course: null, enrollments: [], error: "Unable to load enrollments." };

  const userIds = [...new Set((enrollmentRows ?? []).map((enrollment) => enrollment.user_id))];
  const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
  if (userIds.length) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id,full_name,email")
      .in("id", userIds)
      .overrideTypes<Array<{ id: string; full_name: string | null; email: string | null }>, { merge: false }>();

    if (!profileError) {
      for (const profile of profiles ?? []) {
        profileMap.set(profile.id, { full_name: profile.full_name, email: profile.email });
      }
    }
  }

  const enrollments = (enrollmentRows ?? []).map((enrollment) => {
    const profile = profileMap.get(enrollment.user_id);
    return {
      ...enrollment,
      user_name: profile?.full_name ?? null,
      user_email: profile?.email ?? null,
    };
  });

  const course: AdminCourseDetail = {
    ...row,
    image_url: row.image_path ? supabase.storage.from("course-images").getPublicUrl(row.image_path).data.publicUrl : null,
    enrollment_count: enrollments.length,
    curriculum: normalizeTextList(row.curriculum),
    requirements: normalizeTextList(row.requirements),
  };

  return { course, enrollments, error: null };
}
