"use client";

/* eslint-disable @next/next/no-img-element -- Supabase signed URLs and local blob previews are runtime-generated. */
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, ImagePlus, UserRound, X } from "lucide-react";
import { saveAdminPlacement } from "@/app/actions/admin-placements";
import { validatePlacementImageFile } from "@/lib/storage/placement-image-validation";
import type { AdminPlacementDetail, AdminPlacementOptions } from "@/lib/services/admin-placements";

type PlacementFormValues = {
  candidate_name: string;
  candidate_display_name: string;
  company_id: string;
  job_title: string;
  course_id: string;
  placement_year: number;
  description: string;
  status: "draft" | "published" | "archived";
};

function initialValues(placement: AdminPlacementDetail | null): PlacementFormValues {
  return placement ? {
    candidate_name: "",
    candidate_display_name: placement.candidate_display_name,
    company_id: placement.company_id,
    job_title: placement.job_title,
    course_id: placement.course_id ?? "",
    placement_year: placement.placement_year,
    description: placement.description,
    status: placement.status,
  } : {
    candidate_name: "",
    candidate_display_name: "",
    company_id: "",
    job_title: "",
    course_id: "",
    placement_year: new Date().getFullYear(),
    description: "",
    status: "draft",
  };
}

export function AdminPlacementEditor({
  placement,
  options,
  onCancel,
  onSaved,
}: {
  placement: AdminPlacementDetail | null;
  options: AdminPlacementOptions;
  onCancel?: () => void;
  onSaved?: (id: string) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => initialValues(placement));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(placement?.image_url ?? null);

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  async function selectPhoto(file: File | undefined) {
    setError("");
    if (!file) {
      setPhoto(null);
      setPhotoPreview(placement?.image_url ?? null);
      return;
    }
    const validationError = await validatePlacementImageFile(file);
    if (validationError) {
      setPhoto(null);
      setPhotoPreview(placement?.image_url ?? null);
      setError(validationError);
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    setSuccess("");
    if (!form.company_id) {
      setError("Select a company.");
      return;
    }
    if (photo) {
    const photoError = await validatePlacementImageFile(photo);
    if (photoError) {
      setError(photoError);
      return;
    }
    }
    if (placement && form.status !== placement.status) {
      const publicChange = placement.status === "published" || form.status === "published";
      const message = publicChange
        ? `${form.status === "published" ? "Publish" : "Remove"} this placement story? The public placements page will ${form.status === "published" ? "show" : "no longer show"} the display name, photo, title, company, course, year, and description.`
        : `Change placement status from ${placement.status} to ${form.status}?`;
      if (!window.confirm(message)) return;
    }
    setSaving(true);
    try {
      const { candidate_name, ...editableValues } = form;
      const photoData = new FormData();
      if (photo) photoData.set("photo", photo);
      const result = await saveAdminPlacement(
        placement?.id ?? null,
        placement ? editableValues : { ...editableValues, candidate_name },
        photoData,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(placement ? "Placement updated." : "Placement created as a draft.");
      router.refresh();
      onSaved?.(result.id);
    } catch {
      setError("The placement could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "min-h-10 min-w-0 rounded border border-[#ccd7ce] bg-white px-3 text-sm font-normal text-[#152b2b]";
  const labelClass = "grid min-w-0 gap-1.5 text-xs font-semibold text-[#425252]";

  return (
    <section className="border border-[#dce4dd] bg-white p-4 sm:p-6" aria-labelledby="placement-form-title">
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-[#e5e9e2] pb-4">
        <div><p className="text-[9px] font-bold tracking-[0.14em] text-[#176b55]">PLACEMENT DETAILS</p><h2 id="placement-form-title" className="mt-1 text-lg font-semibold text-[#152b2b]">{placement ? "Edit placement" : "Add a placement"}</h2></div>
        {onCancel ? <button type="button" onClick={onCancel} className="grid h-9 w-9 shrink-0 place-items-center rounded border border-[#dce4dd] text-[#425252]" aria-label="Close placement form"><X size={16} aria-hidden="true" /></button> : null}
      </div>
      <p className="mb-5 border border-[#e8e2c8] bg-[#fffdf2] p-3 text-xs leading-5 text-[#665d3a]">
        Candidate names are admin-only records and are not linked to platform profiles. Publishing shares the display name, optional photo, title, company, course (if selected), year, and description on the public placements page. Candidate email, phone, salary, and exact placement date are not fields in this schema.
      </p>
      {error ? <p role="alert" className="mb-4 border border-[#efc9bd] bg-[#fff5f2] p-3 text-sm text-[#913c30]">{error}</p> : null}
      {success ? <p role="status" className="mb-4 flex items-center gap-2 border border-[#cfe4d6] bg-[#f2f9f3] p-3 text-sm text-[#145b48]"><Check size={15} aria-hidden="true" />{success}</p> : null}
      <form onSubmit={submit} className="grid min-w-0 gap-4 md:grid-cols-2">
        {!placement ? <label className={labelClass}>Candidate name (admin-only)
          <input required maxLength={200} className={fieldClass} value={form.candidate_name} onChange={(event) => setForm({ ...form, candidate_name: event.target.value })} />
        </label> : null}
        <label className={labelClass}>Public display name
          <input required maxLength={200} className={fieldClass} value={form.candidate_display_name} onChange={(event) => setForm({ ...form, candidate_display_name: event.target.value })} />
        </label>
        <label className={labelClass}>Company
          <select required className={fieldClass} value={form.company_id} onChange={(event) => setForm({ ...form, company_id: event.target.value })}>
            <option value="">Select a company</option>
            {options.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
          </select>
        </label>
        <label className={labelClass}>Placement title
          <input required maxLength={200} className={fieldClass} value={form.job_title} onChange={(event) => setForm({ ...form, job_title: event.target.value })} />
        </label>
        <label className={labelClass}>Course (optional)
          <select className={fieldClass} value={form.course_id} onChange={(event) => setForm({ ...form, course_id: event.target.value })}>
            <option value="">No course linked</option>
            {options.courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>
        <label className={labelClass}>Placement year
          <input required type="number" min={2000} max={2200} step={1} className={fieldClass} value={form.placement_year} onChange={(event) => setForm({ ...form, placement_year: Number(event.target.value) })} />
        </label>
        {placement ? (
          <label className={labelClass}>Status
            <select className={fieldClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as PlacementFormValues["status"] })}>
              <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
            </select>
          </label>
        ) : (
          <div className={labelClass}>Status<span className={`${fieldClass} flex items-center`}>Draft (new placements require review before publishing)</span></div>
        )}
        <label className={`${labelClass} md:col-span-2`}>Public description / story
          <textarea maxLength={5000} rows={5} className="min-w-0 rounded border border-[#ccd7ce] bg-white px-3 py-2 text-sm font-normal leading-6 text-[#152b2b]" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
        <div className={`${labelClass} md:col-span-2`}>
          <label htmlFor="placement-photo">Placement photo (optional)</label>
          <div className="grid gap-3 rounded border border-dashed border-[#ccd7ce] bg-[#fafbf8] p-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
            <div>
              <input id="placement-photo" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="block min-h-10 w-full text-xs text-[#425252] file:mr-3 file:min-h-9 file:rounded file:border-0 file:bg-[#e7f1eb] file:px-3 file:text-xs file:font-semibold file:text-[#145b48]" onChange={(event) => { void selectPhoto(event.target.files?.[0]); }} />
              <p className="mt-1 text-[11px] font-normal leading-5 text-[#657474]">JPEG, PNG, or WebP · maximum 5 MB. Selecting a replacement will keep the current image until the placement update succeeds.</p>
            </div>
            {photoPreview
              ? <img src={photoPreview} alt="Placement photo preview" className="h-36 w-full rounded border border-[#dce4dd] bg-white object-contain" />
              : <div className="grid h-36 place-items-center rounded border border-[#dce4dd] bg-white text-[#829188]" aria-label="No placement photo selected"><UserRound size={30} aria-hidden="true" /><ImagePlus size={14} className="sr-only" aria-hidden="true" /></div>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <button type="submit" disabled={saving} className="button button-dark min-h-10 disabled:cursor-wait disabled:opacity-60">{saving ? "Saving…" : placement ? "Save changes" : "Create draft"}</button>
          {onCancel ? <button type="button" onClick={onCancel} className="min-h-10 rounded border border-[#ccd7ce] px-4 text-sm font-semibold text-[#425252]">Cancel</button> : null}
        </div>
      </form>
    </section>
  );
}
