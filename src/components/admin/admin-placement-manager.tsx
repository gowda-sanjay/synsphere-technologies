"use client";

/* eslint-disable @next/next/no-img-element -- Supabase signed image URLs are generated at request time. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Plus, Search, UserRound, X } from "lucide-react";
import { AdminPlacementEditor } from "@/components/admin/admin-placement-editor";
import type {
  AdminPlacementDetail,
  AdminPlacementListData,
  AdminPlacementListItem,
} from "@/lib/services/admin-placements";

type PlacementFilters = {
  search: string;
  company: string;
  course: string;
  status: string;
  yearFrom: string;
  yearTo: string;
};

function statusClass(status: string) {
  if (status === "published") return "bg-[#e7f1eb] text-[#145b48]";
  if (status === "archived") return "bg-[#f0f1ed] text-[#52616d]";
  return "bg-[#fff4df] text-[#7b5b22]";
}

function placementAsDetail(row: AdminPlacementListItem, options: AdminPlacementListData["options"]): AdminPlacementDetail {
  return {
    ...row,
    company: options.companies.find((company) => company.id === row.company_id) ?? null,
    course: row.course_id
      ? options.courses.find((course) => course.id === row.course_id) ?? null
      : null,
  };
}

export function AdminPlacementManager({
  data,
  filters,
  pageSize,
  editPlacement,
  editError,
}: {
  data: AdminPlacementListData;
  filters: PlacementFilters;
  pageSize: number;
  editPlacement: AdminPlacementDetail | null;
  editError: string | null;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(Boolean(editPlacement));
  const [editingPlacement, setEditingPlacement] = useState(editPlacement);

  function pageHref(page: number) {
    const params = new URLSearchParams();
    if (filters.search) params.set("q", filters.search);
    if (filters.company) params.set("company", filters.company);
    if (filters.course) params.set("course", filters.course);
    if (filters.status) params.set("status", filters.status);
    if (filters.yearFrom) params.set("yearFrom", filters.yearFrom);
    if (filters.yearTo) params.set("yearTo", filters.yearTo);
    if (page > 0) params.set("page", String(page));
    const query = params.toString();
    return query ? `/admin/placements?${query}` : "/admin/placements";
  }

  const startRow = data.total ? data.page * pageSize + 1 : 0;
  const endRow = Math.min((data.page + 1) * pageSize, data.total);

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6 flex flex-col gap-3 border-b border-[#dce4dd] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">PLATFORM OPERATIONS</p><h1 className="mt-2 font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">Placement management</h1><p className="mt-1 text-sm text-[#657474]">{data.total.toLocaleString("en-IN")} placement stories</p></div>
        <button type="button" disabled={!formOpen && !data.options.companies.length} className="button button-dark min-h-10 self-start sm:self-auto disabled:cursor-not-allowed disabled:opacity-50" onClick={() => { if (formOpen) { setFormOpen(false); } else { setEditingPlacement(null); setFormOpen(true); } }}>{formOpen ? <X size={15} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}{formOpen ? "Close form" : "Add Placement"}</button>
      </div>

      <p className="mb-5 border border-[#e8e2c8] bg-[#fffdf2] p-3 text-xs leading-5 text-[#665d3a]">
        Placement records are standalone stories and are not linked to candidate profiles, applications, or jobs. Publishing exposes the display name, optional photo, and story details on the public placements page; the admin-only candidate name is not shown there.
      </p>
      {!data.error && !data.options.companies.length ? <p role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">No companies are available to link to a placement. Add or restore a company before creating or editing placement records.</p> : null}
      {data.error ? <div role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{data.error}</div> : null}
      {editError ? <div role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{editError}</div> : null}

      {formOpen && data.options.companies.length ? (
        <div className="mb-6">
          <AdminPlacementEditor
            placement={editingPlacement}
            options={data.options}
            onCancel={() => setFormOpen(false)}
            onSaved={() => { setFormOpen(false); setEditingPlacement(null); router.refresh(); }}
          />
        </div>
      ) : null}

      <form action="/admin/placements" method="get" className="mb-5 grid min-w-0 gap-3 border border-[#dce4dd] bg-white p-4 sm:grid-cols-2 xl:grid-cols-7">
        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-[#425252] sm:col-span-2 xl:col-span-2">Search display name, title, or company
          <span className="relative"><Search size={15} className="absolute left-3 top-3 text-[#718079]" aria-hidden="true" /><input name="q" maxLength={100} defaultValue={filters.search} placeholder="Search placements" className="min-h-10 w-full min-w-0 rounded border border-[#ccd7ce] pl-9 pr-3 text-sm font-normal text-[#152b2b]" /></span>
        </label>
        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-[#425252]">Company
          <select name="company" defaultValue={filters.company} className="min-h-10 min-w-0 rounded border border-[#ccd7ce] bg-white px-3 text-sm font-normal text-[#152b2b]"><option value="">All companies</option>{data.options.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select>
        </label>
        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-[#425252]">Course
          <select name="course" defaultValue={filters.course} className="min-h-10 min-w-0 rounded border border-[#ccd7ce] bg-white px-3 text-sm font-normal text-[#152b2b]"><option value="">All courses</option>{data.options.courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select>
        </label>
        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-[#425252]">Status
          <select name="status" defaultValue={filters.status} className="min-h-10 min-w-0 rounded border border-[#ccd7ce] bg-white px-3 text-sm font-normal text-[#152b2b]"><option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select>
        </label>
        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-[#425252]">Year from
          <input type="number" min={2000} max={2200} name="yearFrom" defaultValue={filters.yearFrom} className="min-h-10 min-w-0 rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" />
        </label>
        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-[#425252]">Year to
          <input type="number" min={2000} max={2200} name="yearTo" defaultValue={filters.yearTo} className="min-h-10 min-w-0 rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" />
        </label>
        <button type="submit" className="button button-dark min-h-10 self-end">Apply filters</button>
      </form>

      {data.placements.length ? (
        <div className="space-y-3">
          {data.placements.map((row) => (
            <article key={row.id} className="grid min-w-0 gap-4 border border-[#e1e7e1] bg-white p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="flex min-w-0 items-center gap-4">
                {row.image_url
                  ? <img src={row.image_url} alt={`${row.candidate_display_name} placement photo`} className="h-16 w-16 shrink-0 rounded border border-[#dce4dd] object-cover" />
                  : <span className="grid h-16 w-16 shrink-0 place-items-center rounded border border-[#dce4dd] bg-[#f3f6f2] text-[#829188]" aria-label="No placement photo"><UserRound size={24} aria-hidden="true" /></span>}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h2 className="break-words text-base font-semibold text-[#152b2b]">{row.candidate_display_name}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${statusClass(row.status)}`}>{row.status}</span></div>
                <p className="mt-1 break-words text-sm text-[#425252]">{row.job_title} · {row.placement_year}</p>
                <p className="mt-1 flex items-center gap-1.5 break-words text-xs text-[#657474]"><Building2 size={13} className="shrink-0" aria-hidden="true" />{row.company_name ?? "Company unavailable"}{row.course_title ? ` · ${row.course_title}` : ""}</p>
                {row.description ? <p className="mt-3 line-clamp-2 break-words text-xs leading-5 text-[#657474]">{row.description}</p> : null}
              </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Link href={`/admin/placements/${row.id}`} className="inline-flex min-h-9 items-center rounded border border-[#ccd7ce] px-3 text-xs font-semibold text-[#425252] hover:border-[#176b55] hover:text-[#145b48]">View details</Link>
                <button type="button" disabled={!data.options.companies.length} onClick={() => { setEditingPlacement(placementAsDetail(row, data.options)); setFormOpen(true); }} className="min-h-9 rounded border border-[#ccd7ce] px-3 text-xs font-semibold text-[#425252] hover:border-[#176b55] hover:text-[#145b48] disabled:cursor-not-allowed disabled:opacity-50">Edit</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-[#d5ded6] bg-white px-4 py-12 text-center">
          <Building2 size={25} className="mx-auto text-[#8b9a91]" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-[#152b2b]">{data.error ? "Placements could not be loaded" : "No placements found"}</p>
          <p className="mt-1 text-xs text-[#657474]">{data.error ? "Review the error above and try again." : "Adjust the filters or add a placement draft."}</p>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 border-t border-[#dce4dd] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#657474]">Showing {startRow.toLocaleString("en-IN")}–{endRow.toLocaleString("en-IN")} of {data.total.toLocaleString("en-IN")}</p>
        <div className="flex items-center gap-2">
          <Link aria-disabled={data.page === 0} tabIndex={data.page === 0 ? -1 : undefined} className={`inline-flex min-h-9 items-center gap-1.5 rounded border px-3 text-xs font-semibold ${data.page === 0 ? "pointer-events-none border-[#e5e9e2] text-[#9aa69f]" : "border-[#ccd7ce] text-[#425252] hover:border-[#176b55]"}`} href={pageHref(Math.max(0, data.page - 1))}><ArrowLeft size={13} aria-hidden="true" />Previous</Link>
          <span className="px-2 text-xs text-[#657474]">Page {data.page + 1}</span>
          <Link aria-disabled={!data.hasNext} tabIndex={!data.hasNext ? -1 : undefined} className={`inline-flex min-h-9 items-center gap-1.5 rounded border px-3 text-xs font-semibold ${!data.hasNext ? "pointer-events-none border-[#e5e9e2] text-[#9aa69f]" : "border-[#ccd7ce] text-[#425252] hover:border-[#176b55]"}`} href={pageHref(data.page + 1)}>Next<ArrowRight size={13} aria-hidden="true" /></Link>
        </div>
      </div>
    </div>
  );
}
