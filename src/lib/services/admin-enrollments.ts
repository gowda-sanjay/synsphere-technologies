import "server-only";

import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "../../../types/database";

export const ADMIN_ENROLLMENT_PAGE_SIZE = 25;

type EnrollmentStatus = Database["public"]["Enums"]["enrollment_status"];

type EnrollmentListRow = Pick<
  Database["public"]["Tables"]["course_enrollments"]["Row"],
  "id" | "status" | "enrolled_at" | "created_at"
> & {
  student: { full_name: string; email: string | null } | null;
  course: { id: string; title: string } | null;
};

type EnrollmentDetailRow = Database["public"]["Tables"]["course_enrollments"]["Row"] & {
  student: {
    full_name: string;
    email: string | null;
    mobile: string | null;
    skills: string[];
    education: Json;
  } | null;
  course: {
    id: string;
    title: string;
    category: string;
    description: string;
    duration: string;
    price: number;
  } | null;
};

export type AdminEnrollmentListItem = {
  id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  student_name: string | null;
  student_email: string | null;
  course_id: string;
  course_title: string | null;
};

export type AdminEnrollmentListData = {
  enrollments: AdminEnrollmentListItem[];
  total: number;
  page: number;
  hasNext: boolean;
  error: string | null;
};

export type AdminEnrollmentDetail = {
  id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  created_at: string;
  student: EnrollmentDetailRow["student"];
  course: EnrollmentDetailRow["course"];
};

const ENROLLMENT_STATUSES = ["pending", "active", "completed", "cancelled"] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_SEARCH_PAGE = 399;

function emptyList(page: number, error: string | null): AdminEnrollmentListData {
  return { enrollments: [], total: 0, page, hasNext: false, error };
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function ilikePattern(value: string): string {
  const escaped = value.replace(/[\\%_,()]/g, "\\$&");
  return `%${escaped}%`;
}

async function getAdminClient() {
  if (!(await isCurrentUserAdmin())) return null;
  return createSupabaseServerClient();
}

export async function getAdminEnrollments(filters: {
  search?: string;
  course?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
} = {}): Promise<AdminEnrollmentListData> {
  const page = Number.isSafeInteger(filters.page) && (filters.page ?? 0) >= 0
    ? Math.min(filters.page ?? 0, (filters.search ?? "").trim() ? MAX_SEARCH_PAGE : 10000)
    : 0;
  const supabase = await getAdminClient();
  if (!supabase) return emptyList(page, "Unable to load enrollments.");

  const search = (filters.search ?? "").trim().slice(0, 100);
  const course = (filters.course ?? "").trim().slice(0, 120);
  const status = ENROLLMENT_STATUSES.includes(filters.status as EnrollmentStatus)
    ? filters.status as EnrollmentStatus
    : "";
  const from = filters.from ?? "";
  const to = filters.to ?? "";

  if ((from && !isValidDate(from)) || (to && !isValidDate(to)) || (from && to && from > to)) {
    return emptyList(page, "Choose a valid enrollment date range.");
  }

  const buildQuery = () => supabase
    .from("course_enrollments")
    .select(
      "id,status,enrolled_at,created_at,student:profiles!course_enrollments_user_id_fkey!inner(full_name,email),course:courses!course_enrollments_course_id_fkey!inner(id,title)",
      { count: "exact" },
    );
  type ListQuery = ReturnType<typeof buildQuery>;
  const applyFilters = (base: ListQuery) => {
    let query = base;
    if (status) query = query.eq("status", status);
    if (from) query = query.gte("enrolled_at", `${from}T00:00:00.000Z`);
    if (to) {
      const exclusiveEnd = new Date(`${to}T00:00:00.000Z`);
      exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
      query = query.lt("enrolled_at", exclusiveEnd.toISOString());
    }
    if (course) query = query.filter("course.title", "ilike", ilikePattern(course));
    return query;
  };

  const offset = page * ADMIN_ENROLLMENT_PAGE_SIZE;
  let data: EnrollmentListRow[] = [];
  let total = 0;

  if (search) {
    const pattern = ilikePattern(search);
    const studentFilter = `full_name.ilike.${pattern},email.ilike.${pattern}`;
    const candidateCount = offset + ADMIN_ENROLLMENT_PAGE_SIZE;

    const [studentResult, courseResult, overlapResult] = await Promise.all([
      applyFilters(buildQuery())
        .or(studentFilter, { foreignTable: "student" })
        .order("enrolled_at", { ascending: false })
        .order("id", { ascending: true })
        .range(0, candidateCount - 1)
        .overrideTypes<EnrollmentListRow[], { merge: false }>(),
      applyFilters(buildQuery())
        .filter("course.title", "ilike", pattern)
        .order("enrolled_at", { ascending: false })
        .order("id", { ascending: true })
        .range(0, candidateCount - 1)
        .overrideTypes<EnrollmentListRow[], { merge: false }>(),
      applyFilters(buildQuery())
        .or(studentFilter, { foreignTable: "student" })
        .filter("course.title", "ilike", pattern)
        .range(0, 0)
        .overrideTypes<EnrollmentListRow[], { merge: false }>(),
    ]);

    const error = studentResult.error ?? courseResult.error ?? overlapResult.error;
    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[admin-enrollments] Search query failed", { code: error.code, message: error.message });
      }
      return emptyList(page, "Unable to search enrollments.");
    }

    const combined = new Map<string, EnrollmentListRow>();
    for (const row of [...(studentResult.data ?? []), ...(courseResult.data ?? [])]) combined.set(row.id, row);
    const ordered = [...combined.values()].sort((left, right) => {
      const dateOrder = right.enrolled_at.localeCompare(left.enrolled_at);
      return dateOrder || left.id.localeCompare(right.id);
    });
    data = ordered.slice(offset, offset + ADMIN_ENROLLMENT_PAGE_SIZE);
    total = Math.max(
      0,
      (studentResult.count ?? 0) + (courseResult.count ?? 0) - (overlapResult.count ?? 0),
    );
  } else {
    const result = await applyFilters(buildQuery())
      .order("enrolled_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + ADMIN_ENROLLMENT_PAGE_SIZE - 1)
      .overrideTypes<EnrollmentListRow[], { merge: false }>();
    if (result.error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[admin-enrollments] List query failed", { code: result.error.code, message: result.error.message });
      }
      return emptyList(page, "Unable to load enrollments.");
    }
    data = result.data ?? [];
    total = result.count ?? 0;
  }

  return {
    enrollments: data.map((row) => ({
      id: row.id,
      status: row.status,
      enrolled_at: row.enrolled_at,
      student_name: row.student?.full_name ?? null,
      student_email: row.student?.email ?? null,
      course_id: row.course?.id ?? "",
      course_title: row.course?.title ?? null,
    })),
    total,
    page,
    hasNext: total > offset + data.length && (!search || page < MAX_SEARCH_PAGE),
    error: null,
  };
}

export async function getAdminEnrollment(
  id: string,
): Promise<{ enrollment: AdminEnrollmentDetail | null; error: string | null }> {
  if (!UUID_PATTERN.test(id)) return { enrollment: null, error: null };

  const supabase = await getAdminClient();
  if (!supabase) return { enrollment: null, error: "Unable to load this enrollment." };

  const { data, error } = await supabase
    .from("course_enrollments")
    .select(
      "id,user_id,course_id,status,enrolled_at,created_at,student:profiles!course_enrollments_user_id_fkey!inner(full_name,email,mobile,skills,education),course:courses!course_enrollments_course_id_fkey!inner(id,title,category,description,duration,price)",
    )
    .eq("id", id)
    .limit(1)
    .overrideTypes<EnrollmentDetailRow[], { merge: false }>();

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[admin-enrollments] Detail query failed", { code: error.code, message: error.message });
    }
    return { enrollment: null, error: "Unable to load this enrollment." };
  }

  const row = data?.[0];
  if (!row) return { enrollment: null, error: null };

  return {
    enrollment: {
      id: row.id,
      status: row.status,
      enrolled_at: row.enrolled_at,
      created_at: row.created_at,
      student: row.student,
      course: row.course,
    },
    error: null,
  };
}
