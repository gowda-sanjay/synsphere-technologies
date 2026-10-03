import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, BriefcaseBusiness, FileText, MapPin, UserRound } from "lucide-react";
import { AdminUserResumeButton } from "@/components/admin/admin-user-resume-button";
import { getAdminUserDetail } from "@/lib/services/admin-users";

type PageProps = { params: Promise<{ id: string }> };
export const metadata: Metadata = { title: "User Details — SynSphere", robots: { index: false, follow: false } };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function renderValue(value: unknown) {
  if (value === null || value === undefined || value === "") return <p className="text-sm text-[#8a9690]">Not provided</p>;
  if (Array.isArray(value)) {
    const items = value.filter((item) => item !== null && item !== undefined && item !== "");
    return items.length ? <ul className="grid gap-2 text-sm text-[#425252]">{items.map((item, index) => <li key={index} className="break-words">{typeof item === "string" ? item : JSON.stringify(item)}</li>)}</ul> : <p className="text-sm text-[#8a9690]">Not provided</p>;
  }
  return <p className="break-words text-sm text-[#425252]">{typeof value === "string" ? value : JSON.stringify(value)}</p>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getAdminUserDetail(id);
  if (!result.data && !result.error) notFound();

  if (result.error || !result.data) {
    return <div role="alert" className="mx-auto max-w-4xl border border-[#efc9bd] bg-[#fff5f2] p-5 text-sm text-[#913c30]">{result.error ?? "Unable to load user."}</div>;
  }

  const user = result.data;
  return (
    <div className="mx-auto max-w-[1200px]">
      <Link href="/admin/users" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-[#176b55] hover:underline"><ArrowLeft size={14} aria-hidden="true" />All users</Link>
      <div className="mb-6 flex min-w-0 flex-col gap-4 border-b border-[#dce4dd] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {user.profile_image_url ? <Image src={user.profile_image_url} alt="" width={56} height={56} unoptimized className="h-14 w-14 shrink-0 rounded-full border border-[#dce4dd] object-cover" /> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#e7f1eb] text-[#145b48]"><UserRound size={23} aria-hidden="true" /></span>}
          <div className="min-w-0"><p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">USER PROFILE</p><h1 className="mt-1 break-words font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">{user.full_name || "Unnamed user"}</h1><p className="mt-1 break-all text-sm text-[#657474]">{user.email ?? "Email unavailable"}</p></div>
        </div>
        <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${user.role === "admin" ? "bg-[#e7f1eb] text-[#145b48]" : "bg-[#f0f1ed] text-[#52616d]"}`}>{user.role === "admin" ? "Admin" : user.role === "user" ? "User" : "No role"}</span>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="min-w-0 space-y-5">
          <section className="min-w-0 border border-[#e1e7e1] bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2"><UserRound size={16} className="text-[#176b55]" aria-hidden="true" /><h2 className="text-base font-semibold text-[#152b2b]">Profile</h2></div>
            <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Full name</dt><dd className="mt-1 break-words text-sm text-[#152b2b]">{user.full_name || "Not provided"}</dd></div>
              <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Email</dt><dd className="mt-1 break-all text-sm text-[#152b2b]">{user.email || "Not provided"}</dd></div>
              <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Mobile</dt><dd className="mt-1 break-words text-sm text-[#152b2b]">{user.mobile || "Not provided"}</dd></div>
              <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Registered</dt><dd className="mt-1 text-sm text-[#152b2b]">{formatDate(user.created_at)}</dd></div>
              <div className="min-w-0 sm:col-span-2"><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Address</dt><dd className="mt-1 break-words text-sm text-[#152b2b]">{user.address || "Not provided"}</dd></div>
            </dl>
            <div className="mt-5 grid min-w-0 gap-5 border-t border-[#edf0eb] pt-5 sm:grid-cols-2">
              <div><h3 className="mb-2 text-xs font-semibold text-[#152b2b]">Skills</h3>{renderValue(user.skills)}</div>
              <div><h3 className="mb-2 text-xs font-semibold text-[#152b2b]">Education</h3>{renderValue(user.education)}</div>
              <div className="sm:col-span-2"><h3 className="mb-2 text-xs font-semibold text-[#152b2b]">Experience</h3>{renderValue(user.experience)}</div>
            </div>
          </section>

          <section className="min-w-0 border border-[#e1e7e1] bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><BriefcaseBusiness size={16} className="text-[#176b55]" aria-hidden="true" /><h2 className="text-base font-semibold text-[#152b2b]">Applications</h2></div><span className="text-xs text-[#657474]">{user.applications.length}{user.applications.length === 100 ? "+" : ""}</span></div>
            {user.applications.length ? <div className="divide-y divide-[#edf0eb]">{user.applications.map((application) => (
              <article key={application.id} className="flex min-w-0 flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="break-words text-sm font-semibold text-[#152b2b]">{application.job_title}</p><p className="mt-1 text-xs text-[#657474]">{application.company_name} · {formatDate(application.created_at)}</p></div>
                <div className="flex shrink-0 items-center justify-between gap-3"><span className="rounded-full bg-[#f0f1ed] px-2.5 py-1 text-[10px] font-semibold capitalize text-[#52616d]">{label(application.status)}</span><Link href={`/admin/applications/${application.id}`} className="text-xs font-semibold text-[#176b55] hover:underline">Details</Link></div>
              </article>
            ))}</div> : <p className="py-3 text-sm text-[#657474]">No applications found.</p>}
          </section>

          <section className="min-w-0 border border-[#e1e7e1] bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2"><BookOpen size={16} className="text-[#176b55]" aria-hidden="true" /><h2 className="text-base font-semibold text-[#152b2b]">Course enrollments</h2></div>
            {user.enrollments.length ? <div className="divide-y divide-[#edf0eb]">{user.enrollments.map((enrollment) => <div key={enrollment.id} className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="break-words text-sm font-semibold text-[#152b2b]">{enrollment.course_title}</p><p className="mt-1 text-xs text-[#657474]">Enrolled {formatDate(enrollment.enrolled_at)}</p></div><span className="w-fit rounded-full bg-[#f0f1ed] px-2.5 py-1 text-[10px] font-semibold capitalize text-[#52616d]">{label(enrollment.status)}</span></div>)}</div> : <p className="py-3 text-sm text-[#657474]">No course enrollments found.</p>}
          </section>
        </div>

        <aside className="min-w-0 space-y-5">
          <section className="border border-[#e1e7e1] bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2"><FileText size={16} className="text-[#176b55]" aria-hidden="true" /><h2 className="text-base font-semibold text-[#152b2b]">Resume</h2></div>
            {user.resume.available ? <><p className="break-words text-sm text-[#152b2b]">{user.resume.file_name ?? "Resume uploaded"}</p><p className="mt-1 text-xs text-[#657474]">{user.resume.mime_type ?? "Document"} · Private file</p><div className="mt-4"><AdminUserResumeButton profileId={user.id} /></div></> : <p className="text-sm text-[#657474]">No resume uploaded.</p>}
          </section>

          <section className="border border-[#e1e7e1] bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2"><MapPin size={16} className="text-[#176b55]" aria-hidden="true" /><h2 className="text-base font-semibold text-[#152b2b]">Placements</h2></div>
            <p className="text-sm text-[#657474]">Placement records are not linked to profile IDs in the current schema, so they cannot be safely attributed to this user.</p>
          </section>

          <section className="border border-[#e1e7e1] bg-white p-4 sm:p-5"><p className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">User ID</p><p className="mt-2 break-all font-mono text-xs text-[#152b2b]">{user.id}</p></section>
        </aside>
      </div>
    </div>
  );
}