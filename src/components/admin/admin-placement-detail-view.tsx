"use client";

/* eslint-disable @next/next/no-img-element -- Supabase signed image URLs are generated at request time. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, GraduationCap, PencilLine, UserRound } from "lucide-react";
import { AdminPlacementEditor } from "@/components/admin/admin-placement-editor";
import type { AdminPlacementDetail, AdminPlacementOptions } from "@/lib/services/admin-placements";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "published") return "bg-[#e7f1eb] text-[#145b48]";
  if (status === "archived") return "bg-[#f0f1ed] text-[#52616d]";
  return "bg-[#fff4df] text-[#7b5b22]";
}

export function AdminPlacementDetailView({
  placement,
  options,
  optionsError,
  initialEdit,
}: {
  placement: AdminPlacementDetail;
  options: AdminPlacementOptions;
  optionsError: string | null;
  initialEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(initialEdit);

  return (
    <div className="mx-auto max-w-[1100px]">
      {optionsError ? <div role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{optionsError}</div> : null}
      <div className="mb-6 flex min-w-0 flex-col gap-4 border-b border-[#dce4dd] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">PLACEMENT STORY</p><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${statusClass(placement.status)}`}>{placement.status}</span></div>
          <h1 className="mt-2 break-words font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">{placement.candidate_display_name}</h1>
          <p className="mt-1 break-words text-sm text-[#657474]">{placement.job_title} · {placement.placement_year}</p>
        </div>
        {!editing && !optionsError ? <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded border border-[#ccd7ce] bg-white px-3 text-xs font-semibold text-[#425252] hover:border-[#176b55] hover:text-[#145b48]"><PencilLine size={14} aria-hidden="true" />Edit placement</button> : null}
      </div>

      {editing && !optionsError ? (
        <div className="mb-6">
          <AdminPlacementEditor
            placement={placement}
            options={options}
            onCancel={() => { setEditing(false); router.replace(`/admin/placements/${placement.id}`); }}
            onSaved={() => { setEditing(false); router.refresh(); }}
          />
        </div>
      ) : null}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <section className="min-w-0 border border-[#e1e7e1] bg-white p-4 sm:p-5 xl:col-span-2">
          <h2 className="mb-3 text-base font-semibold text-[#152b2b]">Placement photo</h2>
          {placement.image_url
            ? <img src={placement.image_url} alt={`${placement.candidate_display_name} placement photo`} className="max-h-[420px] w-full rounded border border-[#dce4dd] bg-[#f3f6f2] object-contain" />
            : <div className="grid min-h-48 place-items-center rounded border border-dashed border-[#d5ded6] bg-[#f7f8f3] text-[#829188]" aria-label="No placement photo"><UserRound size={42} aria-hidden="true" /></div>}
        </section>
        <section className="min-w-0 border border-[#e1e7e1] bg-white p-4 sm:p-5">
          <h2 className="text-base font-semibold text-[#152b2b]">Placement information</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Public display name</dt><dd className="mt-1 break-words text-[#152b2b]">{placement.candidate_display_name}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Title</dt><dd className="mt-1 break-words text-[#152b2b]">{placement.job_title}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Company</dt><dd className="mt-1 flex items-start gap-2 break-words text-[#152b2b]"><Building2 size={14} className="mt-0.5 shrink-0 text-[#176b55]" aria-hidden="true" />{placement.company?.name ?? "Company unavailable"}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Course</dt><dd className="mt-1 flex items-start gap-2 break-words text-[#152b2b]"><GraduationCap size={14} className="mt-0.5 shrink-0 text-[#176b55]" aria-hidden="true" />{placement.course?.title ?? "No course linked"}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Placement year</dt><dd className="mt-1 text-[#152b2b]">{placement.placement_year}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Created / updated</dt><dd className="mt-1 text-[#152b2b]">{formatDate(placement.created_at)}<br />{formatDate(placement.updated_at)}</dd></div>
          </dl>
        </section>

        <section className="min-w-0 border border-[#e1e7e1] bg-white p-4 sm:p-5">
          <h2 className="text-base font-semibold text-[#152b2b]">Public story</h2>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#425252]">{placement.description || "No description provided."}</p>
          <p className="mt-5 border-t border-[#edf0eb] pt-4 text-xs leading-5 text-[#657474]">
            This placement is not linked to a platform profile, job, or application. The schema has no email, phone, salary, or exact placement date fields.
          </p>
          {placement.status === "published" ? <Link href="/placements" className="mt-4 inline-flex text-xs font-semibold text-[#176b55] hover:underline">View public placements</Link> : null}
        </section>
      </div>
    </div>
  );
}
