import type { Metadata } from "next";
import { AdminCourseManager } from "@/components/admin/admin-course-manager";
import { ADMIN_COURSE_PAGE_SIZE, getAdminCourses } from "@/lib/services/admin-courses";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Course Management — SynSphere",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminCoursesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const search = (first(params.q) ?? "").slice(0, 100);
  const status = ["draft", "published", "archived"].includes(first(params.status) ?? "") ? first(params.status) as string : "";
  const category = (first(params.category) ?? "").slice(0, 120);
  const requestedPage = Number.parseInt(first(params.page) ?? "0", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(0, Math.min(requestedPage, 10000)) : 0;
  const result = await getAdminCourses({ search, status, category, page });

  return (
    <AdminCourseManager
      initialCourses={result.courses}
      categories={result.categories}
      total={result.total}
      page={result.page}
      pageSize={ADMIN_COURSE_PAGE_SIZE}
      search={search}
      status={status}
      category={category}
      loadError={result.error}
    />
  );
}
