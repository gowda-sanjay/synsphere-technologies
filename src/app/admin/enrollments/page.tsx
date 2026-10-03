import type { Metadata } from "next";
import { AdminEnrollmentManager } from "@/components/admin/admin-enrollment-manager";
import { ADMIN_ENROLLMENT_PAGE_SIZE, getAdminEnrollments } from "@/lib/services/admin-enrollments";

export const metadata: Metadata = {
  title: "Enrollment Management — SynSphere",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AdminEnrollmentsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const search = first(params.q).slice(0, 100);
  const course = first(params.course).slice(0, 120);
  const status = first(params.status);
  const from = first(params.from);
  const to = first(params.to);
  const requestedPage = Number.parseInt(first(params.page) || "0", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(0, Math.min(requestedPage, 10000)) : 0;

  const result = await getAdminEnrollments({ search, course, status, from, to, page });

  return (
    <AdminEnrollmentManager
      enrollments={result.enrollments}
      total={result.total}
      page={result.page}
      hasNext={result.hasNext}
      pageSize={ADMIN_ENROLLMENT_PAGE_SIZE}
      search={search}
      course={course}
      status={status}
      from={from}
      to={to}
      error={result.error}
    />
  );
}
