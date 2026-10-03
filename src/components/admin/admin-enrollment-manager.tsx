import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, GraduationCap, Search, UserRound } from "lucide-react";
import type { AdminEnrollmentListItem } from "@/lib/services/admin-enrollments";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function statusTone(status: string) {
  switch (status) {
    case "active": return "bg-[#e7f1eb] text-[#145b48]";
    case "completed": return "bg-[#e8efff] text-[#35598b]";
    case "cancelled": return "bg-[#f8ebdb] text-[#834f21]";
    case "pending": return "bg-[#f0f1ed] text-[#657474]";
    default: return "bg-[#f0f1ed] text-[#657474]";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "active": return "Active";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    case "pending": return "Pending";
    default: return "Unknown";
  }
}

export function AdminEnrollmentManager({
  enrollments,
  total,
  page,
  hasNext,
  pageSize,
  search,
  course,
  status,
  from,
  to,
  error,
}: {
  enrollments: AdminEnrollmentListItem[];
  total: number;
  page: number;
  hasNext: boolean;
  pageSize: number;
  search: string;
  course: string;
  status: string;
  from: string;
  to: string;
  error: string | null;
}) {
  const startRow = total ? page * pageSize + 1 : 0;
  const endRow = Math.min((page + 1) * pageSize, total);

  function pageHref(nextPage: number) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (course) params.set("course", course);
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (nextPage > 0) params.set("page", String(nextPage));
    const query = params.toString();
    return query ? `/admin/enrollments?${query}` : "/admin/enrollments";
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-6 flex flex-col gap-3 border-b border-[#dce4dd] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">PLATFORM OPERATIONS</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">Enrollment management</h1>
          <p className="mt-1 text-sm text-[#657474]">{total.toLocaleString("en-IN")} enrollments</p>
        </div>
        <Link href="/admin/courses" className="inline-flex min-h-10 items-center gap-2 self-start text-sm font-semibold text-[#176b55] hover:underline">
          <GraduationCap size={16} aria-hidden="true" />Manage courses
        </Link>
      </div>

      {error ? <div role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{error}</div> : null}

      <form method="get" className="mb-5 border border-[#e1e7e1] bg-white p-4 sm:p-5" aria-label="Search and filter enrollments">
        <div className="grid min-w-0 gap-3 lg:grid-cols-[1.2fr_1fr_170px_170px_auto]">
          <label className="relative min-w-0">
            <span className="sr-only">Search student name, email, or course</span>
            <Search className="pointer-events-none absolute left-3 top-3 text-[#657474]" size={15} aria-hidden="true" />
            <input name="q" defaultValue={search} maxLength={100} className="min-h-10 w-full rounded border border-[#ccd7ce] pl-9 pr-3 text-sm" placeholder="Student name, email, or course" />
          </label>
          <label className="min-w-0">
            <span className="sr-only">Filter by course title</span>
            <input name="course" defaultValue={course} maxLength={120} className="min-h-10 w-full rounded border border-[#ccd7ce] px-3 text-sm" placeholder="Course title" />
          </label>
          <label className="min-w-0">
            <span className="sr-only">Enrollment status</span>
            <select name="status" defaultValue={status} className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm">
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="min-w-0">
              <span className="sr-only">Enrolled from</span>
              <input type="date" name="from" aria-label="Enrolled from" defaultValue={from} max={to || undefined} className="min-h-10 w-full rounded border border-[#ccd7ce] px-2 text-xs" />
            </label>
            <label className="min-w-0">
              <span className="sr-only">Enrolled to</span>
              <input type="date" name="to" aria-label="Enrolled to" defaultValue={to} min={from || undefined} className="min-h-10 w-full rounded border border-[#ccd7ce] px-2 text-xs" />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" className="button button-dark min-h-10">Apply</button>
            <Link href="/admin/enrollments" className="button button-outline min-h-10">Clear</Link>
          </div>
        </div>
      </form>

      {!error && enrollments.length === 0 ? (
        <div className="border border-dashed border-[#ccd7ce] bg-white px-5 py-14 text-center">
          <GraduationCap className="mx-auto text-[#176b55]" size={26} aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-[#152b2b]">No enrollments found</h2>
          <p className="mt-1 text-sm text-[#657474]">{search || course || status || from || to ? "Try changing or clearing the filters." : "Course enrollments will appear here when learners enroll."}</p>
        </div>
      ) : null}

      {enrollments.length ? (
        <>
          {search && total > 10000 ? <p className="mb-3 text-xs text-[#657474]">Showing the first 10,000 matching enrollments. Refine the search to narrow the results.</p> : null}
          <div className="hidden overflow-x-auto border border-[#e1e7e1] bg-white lg:block">
            <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
              <thead className="bg-[#f3f6f2] text-[10px] uppercase tracking-[0.08em] text-[#657474]">
                <tr>
                  <th className="px-3 py-3 font-bold">Enrollment ID</th>
                  <th className="px-3 py-3 font-bold">Student</th>
                  <th className="px-3 py-3 font-bold">Course</th>
                  <th className="px-3 py-3 font-bold">Enrolled</th>
                  <th className="px-3 py-3 font-bold">Status</th>
                  <th className="px-3 py-3 font-bold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0eb]">
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td className="max-w-48 truncate px-3 py-3 font-mono text-[10px] text-[#657474]" title={enrollment.id}>{enrollment.id}</td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-[#152b2b]">{enrollment.student_name || "Name unavailable"}</p>
                      <p className="mt-1 text-[#657474]">{enrollment.student_email || "Email unavailable"}</p>
                    </td>
                    <td className="px-3 py-3 font-medium text-[#425252]">{enrollment.course_title || "Course unavailable"}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-[#657474]">{dateLabel(enrollment.enrolled_at)}</td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusTone(enrollment.status)}`}>{statusLabel(enrollment.status)}</span></td>
                    <td className="px-3 py-3">
                      <Link href={`/admin/enrollments/${enrollment.id}`} className="inline-flex items-center gap-1 font-semibold text-[#176b55] hover:underline">
                        <Eye size={14} aria-hidden="true" />View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {enrollments.map((enrollment) => (
              <article key={enrollment.id} className="border border-[#e1e7e1] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <UserRound size={16} className="shrink-0 text-[#176b55]" aria-hidden="true" />
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-[#152b2b]">{enrollment.student_name || "Name unavailable"}</h2>
                      <p className="truncate text-xs text-[#657474]">{enrollment.student_email || "Email unavailable"}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${statusTone(enrollment.status)}`}>{statusLabel(enrollment.status)}</span>
                </div>
                <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                  <div className="sm:col-span-2"><dt className="text-[#657474]">Course</dt><dd className="mt-1 font-medium text-[#152b2b]">{enrollment.course_title || "Course unavailable"}</dd></div>
                  <div><dt className="text-[#657474]">Enrolled</dt><dd className="mt-1 text-[#152b2b]">{dateLabel(enrollment.enrolled_at)}</dd></div>
                  <div><dt className="text-[#657474]">Enrollment ID</dt><dd className="mt-1 break-all font-mono text-[10px] text-[#425252]">{enrollment.id}</dd></div>
                </dl>
                <Link href={`/admin/enrollments/${enrollment.id}`} className="mt-4 inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-[#176b55] hover:underline">
                  <Eye size={14} aria-hidden="true" />Enrollment details
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 border border-[#e1e7e1] bg-white px-4 py-3 text-xs text-[#657474] sm:flex-row sm:items-center sm:justify-between">
            <span>{startRow.toLocaleString("en-IN")}-{endRow.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}</span>
            <div className="flex items-center gap-2">
              <Link href={pageHref(Math.max(0, page - 1))} aria-disabled={page === 0} tabIndex={page === 0 ? -1 : 0} className={`button button-outline min-h-9 ${page === 0 ? "pointer-events-none opacity-50" : ""}`}>
                <ArrowLeft size={14} aria-hidden="true" />Prev
              </Link>
              <span aria-current="page" className="px-2 font-semibold text-[#152b2b]">{(page + 1).toLocaleString("en-IN")}</span>
              <Link href={pageHref(page + 1)} aria-disabled={!hasNext} tabIndex={!hasNext ? -1 : 0} className={`button button-outline min-h-9 ${!hasNext ? "pointer-events-none opacity-50" : ""}`}>
                Next<ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
