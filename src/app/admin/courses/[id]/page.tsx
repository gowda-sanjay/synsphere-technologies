import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenCheck, Check, GraduationCap, Users } from "lucide-react";
import { getAdminCourse } from "@/lib/services/admin-courses";

type CourseDetailPageProps = { params: Promise<{ id: string }> };

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status: string) {
  switch (status) {
    case "published": return "Published";
    case "draft": return "Draft";
    case "archived": return "Archived";
    default: return "Unknown";
  }
}

export async function generateMetadata({ params }: CourseDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const { course } = await getAdminCourse(id);
  return course ? { title: `${course.title} — Course Details`, description: course.description } : { title: "Course not found — SynSphere" };
}

export default async function AdminCourseDetailPage({ params }: CourseDetailPageProps) {
  const { id } = await params;
  const { course, enrollments, error } = await getAdminCourse(id);

  if (error) {
    return (
      <section className="mx-auto max-w-4xl border border-[#efc9bd] bg-[#fff5f2] p-5 sm:p-8">
        <p className="text-sm font-semibold text-[#913c30]">Unable to load this course.</p>
        <p className="mt-2 text-xs text-[#80594f]">Please refresh the page or return to the course list.</p>
      </section>
    );
  }

  if (!course) notFound();

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-6 flex flex-col gap-3 border-b border-[#dce4dd] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">COURSE DETAILS</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">{course.title}</h1>
        </div>
        <Link href="/admin/courses" className="inline-flex items-center gap-2 text-xs font-semibold text-[#176b55] hover:underline"><ArrowLeft size={14} aria-hidden="true" />Back to courses</Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="border border-[#e1e7e1] bg-white p-4 sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row">
            <div className="h-56 w-full overflow-hidden rounded border border-[#dce4dd] bg-[#f4f6f2] md:max-w-[260px]">
              {course.image_url ? <img src={course.image_url} alt={course.title} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-[#176b55]"><BookOpenCheck size={32} aria-hidden="true" /></div>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${course.status === "published" ? "bg-[#e7f1eb] text-[#145b48]" : course.status === "draft" ? "bg-[#f0f1ed] text-[#657474]" : "bg-[#f8ebdb] text-[#834f21]"}`}>{statusLabel(course.status)}</span>
                <span className="rounded-full bg-[#eef3ff] px-2.5 py-1 text-[10px] font-semibold text-[#35598b]">{course.category}</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-[#425252]">{course.description}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded border border-[#e7ebea] bg-[#f8faf8] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#657474]">Price</p><p className="mt-2 text-base font-semibold text-[#152b2b]">₹{course.price.toLocaleString("en-IN")}</p></div>
                <div className="rounded border border-[#e7ebea] bg-[#f8faf8] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#657474]">Duration</p><p className="mt-2 text-base font-semibold text-[#152b2b]">{course.duration}</p></div>
                <div className="rounded border border-[#e7ebea] bg-[#f8faf8] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#657474]">Level</p><p className="mt-2 text-base font-semibold text-[#152b2b]">{course.level}</p></div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#176b55]">Curriculum</p>
              <ul className="mt-3 space-y-2">
                {course.curriculum.length ? course.curriculum.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex items-start gap-2 text-sm text-[#425252]"><span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e7f1eb] text-[10px] font-bold text-[#145b48]">{index + 1}</span><span>{item}</span></li>
                )) : <li className="text-sm text-[#657474]">No curriculum items recorded.</li>}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#176b55]">Requirements</p>
              <ul className="mt-3 space-y-2">
                {course.requirements.length ? course.requirements.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex items-start gap-2 text-sm text-[#425252]"><Check size={14} className="mt-0.5 shrink-0 text-[#176b55]" aria-hidden="true" /><span>{item}</span></li>
                )) : <li className="text-sm text-[#657474]">No prerequisites recorded.</li>}
              </ul>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="border border-[#e1e7e1] bg-white p-4 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#176b55]">Overview</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 border-b border-[#edf0eb] pb-2"><dt className="text-[#657474]">Created</dt><dd className="text-[#152b2b]">{dateLabel(course.created_at)}</dd></div>
              <div className="flex items-center justify-between gap-3 border-b border-[#edf0eb] pb-2"><dt className="text-[#657474]">Enrollments</dt><dd className="text-[#152b2b]">{course.enrollment_count}</dd></div>
              <div className="flex items-center justify-between gap-3 border-b border-[#edf0eb] pb-2"><dt className="text-[#657474]">Status</dt><dd className="text-[#152b2b]">{statusLabel(course.status)}</dd></div>
            </dl>
          </section>

          <section className="border border-[#e1e7e1] bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-[#176b55]" aria-hidden="true" />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#176b55]">Enrollment activity</p>
            </div>
            <div className="mt-3 text-sm text-[#425252]">
              {enrollments.length ? `${enrollments.length} learner${enrollments.length === 1 ? "" : "s"} enrolled.` : "No learners have enrolled yet."}
            </div>
          </section>
        </aside>
      </div>

      <section className="mt-6 border border-[#e1e7e1] bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-[#e5e9e2] px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-[#176b55]" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[#152b2b]">Enrollments</h2>
          </div>
          <span className="text-xs text-[#657474]">{enrollments.length} total</span>
        </div>

        {enrollments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-xs">
              <thead className="bg-[#f3f6f2] text-[10px] uppercase tracking-[0.08em] text-[#657474]">
                <tr>
                  {['Student', 'Email', 'Status', 'Enrolled'].map((heading) => <th key={heading} className="px-3 py-3 font-bold">{heading}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0eb]">
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td className="px-3 py-3 font-medium text-[#152b2b]">{enrollment.user_name || "Unnamed learner"}</td>
                    <td className="px-3 py-3 text-[#425252]">{enrollment.user_email || "Email unavailable"}</td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${enrollment.status === "completed" ? "bg-[#e7f1eb] text-[#145b48]" : enrollment.status === "active" ? "bg-[#edf3ec] text-[#176b55]" : "bg-[#f0f1ed] text-[#657474]"}`}>{enrollment.status}</span></td>
                    <td className="whitespace-nowrap px-3 py-3 text-[#657474]">{dateLabel(enrollment.enrolled_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-8 text-sm text-[#657474]">No enrollments are recorded for this course yet.</p>
        )}
      </section>
    </div>
  );
}
