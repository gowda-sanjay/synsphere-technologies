import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Check, GraduationCap, Mail, Phone, UserRound } from "lucide-react";
import { getAdminEnrollment } from "@/lib/services/admin-enrollments";
import type { Json } from "../../../../../types/database";

type EnrollmentDetailPageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Enrollment Details — SynSphere",
  robots: { index: false, follow: false },
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status: string) {
  switch (status) {
    case "pending": return "Pending";
    case "active": return "Active";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return "Unknown";
  }
}

function educationLabels(value: Json): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(educationLabels);
  if (value && typeof value === "object") {
    const allowedKeys = ["degree", "qualification", "field", "institution", "school", "university", "graduation_year"];
    return allowedKeys.flatMap((key) => {
      const item = value[key];
      return typeof item === "string" && item.trim() ? [item.trim()] : [];
    });
  }
  return [];
}

export default async function AdminEnrollmentDetailPage({ params }: EnrollmentDetailPageProps) {
  const { id } = await params;
  const { enrollment, error } = await getAdminEnrollment(id);

  if (error) {
    return (
      <section role="alert" className="mx-auto max-w-4xl border border-[#efc9bd] bg-[#fff5f2] p-5 sm:p-8">
        <p className="text-sm font-semibold text-[#913c30]">{error}</p>
        <Link href="/admin/enrollments" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#176b55] hover:underline">
          <ArrowLeft size={14} aria-hidden="true" />Back to enrollments
        </Link>
      </section>
    );
  }
  if (!enrollment) notFound();

  const student = enrollment.student;
  const course = enrollment.course;
  const education = student ? educationLabels(student.education) : [];

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-6 flex flex-col gap-3 border-b border-[#dce4dd] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">ENROLLMENT DETAILS</p>
          <h1 className="mt-2 break-all font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">{enrollment.id}</h1>
        </div>
        <Link href="/admin/enrollments" className="inline-flex items-center gap-2 text-xs font-semibold text-[#176b55] hover:underline">
          <ArrowLeft size={14} aria-hidden="true" />Back to enrollments
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="border border-[#e1e7e1] bg-white p-4 sm:p-6">
          <div className="flex items-center gap-2 border-b border-[#edf0eb] pb-4">
            <UserRound size={17} className="text-[#176b55]" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[#152b2b]">Student</h2>
          </div>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-[#657474]">Name</dt>
              <dd className="mt-1 font-semibold text-[#152b2b]">{student?.full_name || "Not available"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#657474]">Email</dt>
              <dd className="mt-1 flex items-center gap-2 text-[#152b2b]"><Mail size={14} aria-hidden="true" />{student?.email || "Not available"}</dd>
            </div>
            {student?.mobile ? (
              <div>
                <dt className="text-xs font-medium text-[#657474]">Mobile</dt>
                <dd className="mt-1 flex items-center gap-2 text-[#152b2b]"><Phone size={14} aria-hidden="true" />{student.mobile}</dd>
              </div>
            ) : null}
            {education.length ? (
              <div>
                <dt className="text-xs font-medium text-[#657474]">Education</dt>
                <dd className="mt-1 text-[#152b2b]">{education.join(" · ")}</dd>
              </div>
            ) : null}
            {student?.skills.length ? (
              <div>
                <dt className="text-xs font-medium text-[#657474]">Skills</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {student.skills.map((skill, index) => <span key={`${skill}-${index}`} className="rounded-full bg-[#e7f1eb] px-2.5 py-1 text-xs text-[#145b48]">{skill}</span>)}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="border border-[#e1e7e1] bg-white p-4 sm:p-6">
          <div className="flex items-center gap-2 border-b border-[#edf0eb] pb-4">
            <BookOpen size={17} className="text-[#176b55]" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[#152b2b]">Course</h2>
          </div>
          {course ? (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-[#152b2b]">{course.title}</h3>
              <p className="mt-1 text-xs font-semibold text-[#176b55]">{course.category}</p>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#425252]">{course.description}</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded border border-[#e7ebea] bg-[#f8faf8] p-3"><dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#657474]">Duration</dt><dd className="mt-1 text-sm font-semibold text-[#152b2b]">{course.duration}</dd></div>
                <div className="rounded border border-[#e7ebea] bg-[#f8faf8] p-3"><dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#657474]">Price</dt><dd className="mt-1 text-sm font-semibold text-[#152b2b]">₹{course.price.toLocaleString("en-IN")}</dd></div>
              </dl>
            </div>
          ) : <p className="mt-4 text-sm text-[#657474]">Course information is unavailable.</p>}
        </section>

        <section className="border border-[#e1e7e1] bg-white p-4 sm:col-span-2 sm:p-6">
          <div className="flex items-center gap-2 border-b border-[#edf0eb] pb-4">
            <GraduationCap size={18} className="text-[#176b55]" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[#152b2b]">Enrollment</h2>
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-xs font-medium text-[#657474]">Enrollment ID</dt><dd className="mt-1 break-all font-mono text-xs text-[#152b2b]">{enrollment.id}</dd></div>
            <div><dt className="text-xs font-medium text-[#657474]">Enrolled</dt><dd className="mt-1 text-sm text-[#152b2b]">{dateLabel(enrollment.enrolled_at)}</dd></div>
            <div><dt className="text-xs font-medium text-[#657474]">Status</dt><dd className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#e7f1eb] px-2.5 py-1 text-xs font-semibold text-[#145b48]"><Check size={13} aria-hidden="true" />{statusLabel(enrollment.status)}</dd></div>
            <div><dt className="text-xs font-medium text-[#657474]">Record created</dt><dd className="mt-1 text-sm text-[#152b2b]">{dateLabel(enrollment.created_at)}</dd></div>
          </dl>
          <p className="mt-5 border-t border-[#edf0eb] pt-4 text-xs text-[#657474]">Enrollment status is shown read-only; this screen does not modify enrollment records.</p>
        </section>
      </div>
    </div>
  );
}
