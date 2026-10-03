import "server-only";

import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isPlacementImagePath } from "@/lib/storage/placement-image-validation";
import type { Database } from "../../../types/database";

export const ADMIN_PLACEMENT_PAGE_SIZE = 25;

type PlacementStatus = Database["public"]["Enums"]["placement_status"];
type PlacementRow = Pick<
  Database["public"]["Tables"]["placements"]["Row"],
  "id" | "candidate_display_name" | "company_id" | "job_title" | "course_id" | "placement_year" | "description" | "image_path" | "status" | "created_at" | "updated_at"
>;
type PlacementListQueryRow = PlacementRow & {
  company: { id: string; name: string } | null;
  course: { id: string; title: string } | null;
};
type CompanyOption = Pick<Database["public"]["Tables"]["companies"]["Row"], "id" | "name">;
type CourseOption = Pick<Database["public"]["Tables"]["courses"]["Row"], "id" | "title">;

type AdminPlacementVisibleRow = Omit<PlacementRow, "image_path"> & { image_url: string | null };

export type AdminPlacementListItem = AdminPlacementVisibleRow & {
  company_name: string | null;
  course_title: string | null;
};

export type AdminPlacementDetail = AdminPlacementVisibleRow & {
  company: CompanyOption | null;
  course: CourseOption | null;
};

export type AdminPlacementOptions = {
  companies: CompanyOption[];
  courses: CourseOption[];
};

export type AdminPlacementListData = {
  placements: AdminPlacementListItem[];
  options: AdminPlacementOptions;
  total: number;
  page: number;
  hasNext: boolean;
  error: string | null;
};

const PLACEMENT_STATUSES = ["draft", "published", "archived"] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEARCH_RESULT_LIMIT = 10000;
const SEARCH_PAGE_LIMIT = Math.floor(SEARCH_RESULT_LIMIT / ADMIN_PLACEMENT_PAGE_SIZE);
const PLACEMENT_IMAGE_BUCKET = "placement-images";
const PLACEMENT_IMAGE_URL_EXPIRY_SECONDS = 60;

function emptyList(page: number, error: string | null): AdminPlacementListData {
  return { placements: [], options: { companies: [], courses: [] }, total: 0, page, hasNext: false, error };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_,()]/g, "\\$&");
}

async function createAdminPlacementImageUrl(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  imagePath: string | null,
) {
  if (!imagePath) return null;
  if (!isPlacementImagePath(imagePath)) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-placements] Image path did not match the placement image key format.");
    return null;
  }
  const { data, error } = await supabase.storage.from(PLACEMENT_IMAGE_BUCKET)
    .createSignedUrl(imagePath, PLACEMENT_IMAGE_URL_EXPIRY_SECONDS);
  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-placements] Image signed URL failed", { code: error.statusCode, message: error.message });
    return null;
  }
  return data?.signedUrl ?? null;
}

async function getAdminClient() {
  if (!(await isCurrentUserAdmin())) return null;
  return createSupabaseServerClient();
}

async function getPlacementOptions(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
): Promise<{ options: AdminPlacementOptions; error: { code?: string; message: string } | null }> {
  const [companiesResult, coursesResult] = await Promise.all([
    supabase.from("companies").select("id,name").order("name").limit(SEARCH_RESULT_LIMIT)
      .overrideTypes<CompanyOption[], { merge: false }>(),
    supabase.from("courses").select("id,title").order("title").limit(SEARCH_RESULT_LIMIT)
      .overrideTypes<CourseOption[], { merge: false }>(),
  ]);
  const error = companiesResult.error ?? coursesResult.error;
  if (error) return { options: { companies: [], courses: [] }, error };
  return {
    options: { companies: companiesResult.data ?? [], courses: coursesResult.data ?? [] },
    error: null,
  };
}

export async function getAdminPlacementOptions(): Promise<{ options: AdminPlacementOptions; error: string | null }> {
  const supabase = await getAdminClient();
  if (!supabase) return { options: { companies: [], courses: [] }, error: "Unable to load placement filters." };
  const result = await getPlacementOptions(supabase);
  if (result.error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[admin-placements] Filter options query failed", { code: result.error.code, message: result.error.message });
    }
    return { options: { companies: [], courses: [] }, error: "Unable to load placement filters." };
  }
  return { options: result.options, error: null };
}

async function findPlacementIds(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  search: string,
): Promise<{ ids: string[]; error: { code?: string; message: string } | null; tooMany: boolean }> {
  const pattern = `%${escapeLike(search)}%`;
  const [displayNameResult, jobTitleResult, companyResult] = await Promise.all([
    supabase.from("placements").select("id", { count: "exact" })
      .ilike("candidate_display_name", pattern)
      .limit(SEARCH_RESULT_LIMIT)
      .overrideTypes<Array<{ id: string }>, { merge: false }>(),
    supabase.from("placements").select("id", { count: "exact" }).ilike("job_title", pattern)
      .limit(SEARCH_RESULT_LIMIT)
      .overrideTypes<Array<{ id: string }>, { merge: false }>(),
    supabase.from("companies").select("id", { count: "exact" }).ilike("name", pattern)
      .limit(SEARCH_RESULT_LIMIT)
      .overrideTypes<Array<{ id: string }>, { merge: false }>(),
  ]);
  const error = displayNameResult.error ?? jobTitleResult.error ?? companyResult.error;
  if (error) return { ids: [], error, tooMany: false };
  if (
    (displayNameResult.count ?? 0) > SEARCH_RESULT_LIMIT ||
    (jobTitleResult.count ?? 0) > SEARCH_RESULT_LIMIT ||
    (companyResult.count ?? 0) > SEARCH_RESULT_LIMIT
  ) {
    return { ids: [], error: null, tooMany: true };
  }

  const companyIds = (companyResult.data ?? []).map((company) => company.id);
  let companyPlacements: Array<{ id: string }> = [];
  if (companyIds.length) {
    const { data, error: placementError, count } = await supabase.from("placements")
      .select("id", { count: "exact" })
      .in("company_id", companyIds)
      .limit(SEARCH_RESULT_LIMIT)
      .overrideTypes<Array<{ id: string }>, { merge: false }>();
    if (placementError) return { ids: [], error: placementError, tooMany: false };
    if ((count ?? 0) > SEARCH_RESULT_LIMIT) return { ids: [], error: null, tooMany: true };
    companyPlacements = data ?? [];
  }

  return {
    ids: [...new Set([
      ...(displayNameResult.data ?? []).map((row) => row.id),
      ...(jobTitleResult.data ?? []).map((row) => row.id),
      ...companyPlacements.map((row) => row.id),
    ])],
    error: null,
    tooMany: false,
  };
}

export async function getAdminPlacements(filters: {
  search?: string;
  company?: string;
  course?: string;
  status?: string;
  yearFrom?: string;
  yearTo?: string;
  page?: number;
} = {}): Promise<AdminPlacementListData> {
  const search = (filters.search ?? "").trim().slice(0, 100);
  const maxPage = search ? SEARCH_PAGE_LIMIT : 10000;
  const page = Number.isSafeInteger(filters.page) && (filters.page ?? 0) >= 0
    ? Math.min(filters.page ?? 0, maxPage)
    : 0;
  const supabase = await getAdminClient();
  if (!supabase) return emptyList(page, "Unable to load placements.");

  const optionsResult = await getPlacementOptions(supabase);
  if (optionsResult.error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[admin-placements] Filter options query failed", { code: optionsResult.error.code, message: optionsResult.error.message });
    }
    return emptyList(page, "Unable to load placement filters.");
  }

  const companyId = filters.company ?? "";
  const courseId = filters.course ?? "";
  const status = PLACEMENT_STATUSES.includes(filters.status as PlacementStatus)
    ? filters.status as PlacementStatus
    : "";
  const yearFrom = filters.yearFrom ? Number(filters.yearFrom) : null;
  const yearTo = filters.yearTo ? Number(filters.yearTo) : null;
  if (
    (companyId && !UUID_PATTERN.test(companyId)) ||
    (courseId && !UUID_PATTERN.test(courseId)) ||
    (yearFrom !== null && (!Number.isInteger(yearFrom) || yearFrom < 2000 || yearFrom > 2200)) ||
    (yearTo !== null && (!Number.isInteger(yearTo) || yearTo < 2000 || yearTo > 2200)) ||
    (yearFrom !== null && yearTo !== null && yearFrom > yearTo)
  ) {
    return { ...emptyList(page, "Choose valid placement filters."), options: optionsResult.options };
  }

  let matchingIds: string[] | null = null;
  if (search) {
    const searchResult = await findPlacementIds(supabase, search);
    if (searchResult.error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[admin-placements] Search query failed", { code: searchResult.error.code, message: searchResult.error.message });
      }
      return { ...emptyList(page, "Unable to search placements."), options: optionsResult.options };
    }
    if (searchResult.tooMany) {
      return { ...emptyList(page, "Too many matches. Add a filter or use a more specific search."), options: optionsResult.options };
    }
    matchingIds = searchResult.ids;
    if (!matchingIds.length) {
      return { ...emptyList(page, null), options: optionsResult.options };
    }
  }

  let query = supabase.from("placements")
    .select(
      "id,candidate_display_name,company_id,job_title,course_id,placement_year,description,image_path,status,created_at,updated_at,company:companies!placements_company_id_fkey!inner(id,name),course:courses!placements_course_id_fkey(id,title)",
      { count: "exact" },
    );
  if (companyId) query = query.eq("company_id", companyId);
  if (courseId) query = query.eq("course_id", courseId);
  if (status) query = query.eq("status", status);
  if (yearFrom !== null) query = query.gte("placement_year", yearFrom);
  if (yearTo !== null) query = query.lte("placement_year", yearTo);
  if (matchingIds) query = query.in("id", matchingIds);

  const offset = page * ADMIN_PLACEMENT_PAGE_SIZE;
  const { data, error, count } = await query
    .order("placement_year", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + ADMIN_PLACEMENT_PAGE_SIZE - 1)
    .overrideTypes<PlacementListQueryRow[], { merge: false }>();

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[admin-placements] List query failed", { code: error.code, message: error.message });
    }
    return { ...emptyList(page, "Unable to load placements."), options: optionsResult.options };
  }

  const total = count ?? 0;
  const placements = await Promise.all((data ?? []).map(async ({ company, course, image_path, ...placement }) => ({
    ...placement,
    image_url: await createAdminPlacementImageUrl(supabase, image_path),
    company_name: company?.name ?? null,
    course_title: course?.title ?? null,
  })));
  return {
    placements,
    options: optionsResult.options,
    total,
    page,
    hasNext: total > offset + placements.length && (!search || page < SEARCH_PAGE_LIMIT),
    error: null,
  };
}

export async function getAdminPlacement(
  id: string,
): Promise<{ placement: AdminPlacementDetail | null; error: string | null }> {
  if (!UUID_PATTERN.test(id)) return { placement: null, error: null };
  const supabase = await getAdminClient();
  if (!supabase) return { placement: null, error: "Unable to load this placement." };

  const { data, error } = await supabase.from("placements")
    .select(
      "id,candidate_display_name,company_id,job_title,course_id,placement_year,description,image_path,status,created_at,updated_at,company:companies!placements_company_id_fkey(id,name),course:courses!placements_course_id_fkey(id,title)",
    )
    .eq("id", id)
    .limit(1)
    .overrideTypes<PlacementListQueryRow[], { merge: false }>();

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[admin-placements] Detail query failed", { code: error.code, message: error.message });
    }
    return { placement: null, error: "Unable to load this placement." };
  }

  const row = data?.[0];
  if (!row) return { placement: null, error: null };
  const { image_path, ...placement } = row;
  return {
    placement: {
      ...placement,
      image_url: await createAdminPlacementImageUrl(supabase, image_path),
    },
    error: null,
  };
}
