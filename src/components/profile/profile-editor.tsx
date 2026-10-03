"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Camera, CheckCircle2, Download, FileText, LoaderCircle, Trash2, UploadCloud, UserRound } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createMyResumeUrl, deleteMyResume, uploadResume } from "@/lib/services/documents";
import type { Profile } from "@/lib/services/profiles";
import { profileUpdateSchema, type ProfileFormValues } from "@/lib/validations/auth";
import { validateProfileImageFile } from "@/lib/storage/profile-image-validation";
import { validateResumeFile } from "@/lib/storage/resume-validation";

export type ResumeDocument = {
  id: string;
  user_id: string;
  document_type: "resume";
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
};

function parseList(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function logResumeDebug(stage: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[resume-debug] ${stage}`, details ?? "");
  }
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (!parts.length) return "SS";
  return (parts[0]?.[0] ?? "S") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "S");
}

export function ProfileEditor({
  initialProfile,
  userEmail,
  initialResume,
  initialProfileImageUrl,
  completion,
}: {
  initialProfile: Profile;
  userEmail: string;
  initialResume: ResumeDocument | null;
  initialProfileImageUrl?: string | null;
  completion: number;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [imageError, setImageError] = useState("");
  const [resumeError, setResumeError] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeDeleting, setResumeDeleting] = useState(false);
  const [profileImagePath, setProfileImagePath] = useState(initialProfile.profile_image_path ?? null);
  const [profileImageUrl, setProfileImageUrl] = useState(initialProfileImageUrl ?? "");
  const [resumeRecord, setResumeRecord] = useState<ResumeDocument | null>(initialResume);
  const [resumePath, setResumePath] = useState(initialResume?.file_path ?? null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      full_name: initialProfile.full_name ?? "",
      mobile: initialProfile.mobile ?? "",
      address: initialProfile.address ?? "",
      skills: Array.isArray(initialProfile.skills) ? initialProfile.skills.join(", ") : "",
      education: Array.isArray(initialProfile.education) ? (initialProfile.education as string[]).join("\n") : "",
      experience: Array.isArray(initialProfile.experience) ? (initialProfile.experience as string[]).join("\n") : "",
    },
  });

  const displayName = initialProfile.full_name?.trim() || userEmail || "Your profile";

  async function onSubmit(values: ProfileFormValues) {
    setFormError("");
    setFormSuccess("");

    const parsed = profileUpdateSchema.parse(values);
    const patch = {
      full_name: parsed.full_name.trim(),
      mobile: parsed.mobile?.trim() || null,
      address: parsed.address?.trim() || null,
      skills: parseList(parsed.skills),
      education: parseList(parsed.education),
      experience: parseList(parsed.experience),
    };

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setFormError("Profile updates are unavailable right now.");
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setFormError("Please sign in to update your profile.");
      return;
    }

    const { data, error } = await supabase.from("profiles")
      .update(patch)
      .eq("id", authData.user.id)
      .select("id,full_name,email,mobile,address,profile_image_path,skills,education,experience,resume_path,status,created_at,updated_at")
      .limit(1)
      .overrideTypes<Array<Profile>, { merge: false }>();

    if (error || !data?.[0]) {
      setFormError("Profile could not be updated.");
      return;
    }

    setFormSuccess("Profile updated successfully.");
    reset({
      full_name: data[0].full_name ?? parsed.full_name,
      mobile: data[0].mobile ?? "",
      address: data[0].address ?? "",
      skills: Array.isArray(data[0].skills) ? data[0].skills.join(", ") : "",
      education: Array.isArray(data[0].education) ? (data[0].education as string[]).join("\n") : "",
      experience: Array.isArray(data[0].experience) ? (data[0].experience as string[]).join("\n") : "",
    });
    router.refresh();
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateProfileImageFile(file);
    if (validationError) {
      setImageError(validationError);
      event.target.value = "";
      return;
    }

    setImageUploading(true);
    setImageError("");

    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setImageError("Profile image upload is unavailable right now.");
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setImageError("Please sign in to update your profile photo.");
        return;
      }

      const extension = file.name.split(".").at(-1)?.toLowerCase() || "png";
      const nextPath = `${authData.user.id}/profile.${extension}`;
      const { error: uploadError } = await supabase.storage.from("profile-images").upload(nextPath, file, {
        contentType: file.type || `image/${extension}`,
        upsert: true,
      });

      if (uploadError) {
        setImageError("The profile image could not be uploaded.");
        return;
      }

      if (profileImagePath && profileImagePath !== nextPath) {
        await supabase.storage.from("profile-images").remove([profileImagePath]);
      }

      const { error: profileError } = await supabase.from("profiles")
        .update({ profile_image_path: nextPath })
        .eq("id", authData.user.id);

      if (profileError) {
        setImageError("The profile image was uploaded but could not be linked to your profile.");
        return;
      }

      const { data: signedUrlData } = await supabase.storage.from("profile-images").createSignedUrl(nextPath, 60);
      setProfileImagePath(nextPath);
      setProfileImageUrl(signedUrlData?.signedUrl ?? "");
      setFormSuccess("Profile image updated successfully.");
      router.refresh();
    } catch {
      setImageError("The profile image could not be uploaded.");
    } finally {
      setImageUploading(false);
      event.target.value = "";
    }
  }

  async function handleResumeUpload(event: React.ChangeEvent<HTMLInputElement>) {
    logResumeDebug("file input changed");
    const file = event.target.files?.[0];
    logResumeDebug("file selected", file ? {
      fileName: file.name,
      size: file.size,
      type: file.type,
      filesLength: event.target.files?.length ?? 0,
    } : { filesLength: event.target.files?.length ?? 0 });
    if (!file) {
      setResumeError("Please select a resume first.");
      logResumeDebug("upload stopped: no file selected");
      return;
    }

    logResumeDebug("validation started", { fileName: file.name, size: file.size, type: file.type });
    const validationError = validateResumeFile(file);
    if (validationError) {
      logResumeDebug("validation failed", { reason: validationError });
      setResumeError(validationError);
      event.target.value = "";
      return;
    }
    logResumeDebug("validation passed", { fileName: file.name });
    logResumeDebug("upload handler started");

    setResumeUploading(true);
    setResumeError("");

    try {
      if (resumePath) {
        logResumeDebug("replacing existing resume: cleanup started", { hasExistingResume: true });
        const deleteResult = await deleteMyResume(resumePath);
        if (deleteResult.error) {
          logResumeDebug("existing resume cleanup failed", { reason: deleteResult.error });
          setResumeError(deleteResult.error);
          return;
        }
        logResumeDebug("existing resume cleanup passed");
      }

      logResumeDebug("calling documents.uploadResume", { fileName: file.name, size: file.size, type: file.type });
      const result = await uploadResume(file);
      if (result.error) {
        logResumeDebug("documents.uploadResume failed", { reason: result.error });
        setResumeError(result.error);
        return;
      }

      if (result.data) {
        logResumeDebug("documents.uploadResume succeeded", { fileName: result.data.file_name, path: result.data.file_path });
        setResumeRecord(result.data as ResumeDocument);
        setResumePath(result.data.file_path);
        setFormSuccess("Resume uploaded successfully.");
      } else {
        logResumeDebug("documents.uploadResume returned no document");
      }
      router.refresh();
    } catch (error) {
      logResumeDebug("upload handler threw", {
        message: error instanceof Error ? error.message : String(error),
      });
      setResumeError("The resume could not be uploaded.");
    } finally {
      setResumeUploading(false);
      event.target.value = "";
    }
  }

  async function openResumeUrl(mode: "view" | "download") {
    if (!resumeRecord) return;
    setResumeLoading(true);
    setResumeError("");

    const result = await createMyResumeUrl(resumeRecord.file_path);
    if (result.error) {
      setResumeError(result.error);
      setResumeLoading(false);
      return;
    }

    if (!result.data) {
      setResumeError("The resume could not be opened.");
      setResumeLoading(false);
      return;
    }

    if (mode === "view") {
      window.open(result.data, "_blank", "noopener,noreferrer");
    } else {
      const anchor = document.createElement("a");
      anchor.href = result.data;
      anchor.download = resumeRecord.file_name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }

    setResumeLoading(false);
  }

  async function handleResumeDelete() {
    if (!resumeRecord) return;
    const confirmed = window.confirm("Delete this resume?");
    if (!confirmed) return;

    setResumeDeleting(true);
    setResumeError("");

    const result = await deleteMyResume(resumeRecord.file_path);
    if (result.error) {
      setResumeError(result.error);
      setResumeDeleting(false);
      return;
    }

    setResumeRecord(null);
    setResumePath(null);
    setFormSuccess("Resume deleted successfully.");
    setResumeDeleting(false);
    router.refresh();
  }

  return (
    <section className="shell py-6 md:py-8">
      <div className="rounded-[28px] border border-[#e5e9e2] bg-white p-4 shadow-[0_20px_60px_rgba(17,31,31,0.08)] md:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[#dfe7dd] bg-[#edf3ec] text-lg font-bold text-[#176b55]">
              {profileImageUrl ? (
                <Image src={profileImageUrl} alt={displayName} width={64} height={64} className="h-full w-full object-cover" unoptimized />
              ) : (
                getInitials(displayName)
              )}
            </div>
            <div>
              <p className="eyebrow">PROFILE SETTINGS</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#152b2b] md:text-[2.2rem]">{displayName}</h1>
              <p className="mt-1 text-sm text-[#657474]">{userEmail}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e5e9e2] bg-[#fbfcf8] px-4 py-3 text-right">
            <p className="eyebrow">PROFILE COMPLETION</p>
            <p className="mt-2 text-2xl font-semibold text-[#152b2b]">{completion}%</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            <section className="rounded-2xl border border-[#e5e9e2] bg-[#fbfcf8] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">PERSONAL INFORMATION</p>
                  <h2 className="mt-2 text-xl font-semibold text-[#152b2b]">Your profile</h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf3ec] text-[#176b55]">
                  <UserRound size={18} aria-hidden="true" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="form-field md:col-span-2">
                  <label htmlFor="profile-name">Full name</label>
                  <input id="profile-name" autoComplete="name" {...register("full_name")} aria-invalid={Boolean(errors.full_name)} />
                  {errors.full_name ? <span className="field-error">{errors.full_name.message}</span> : null}
                </div>

                <div className="form-field">
                  <label htmlFor="profile-email">Email</label>
                  <input id="profile-email" type="email" value={userEmail} readOnly disabled className="cursor-not-allowed bg-[#f3f6f2]" />
                </div>

                <div className="form-field">
                  <label htmlFor="profile-mobile">Mobile</label>
                  <input id="profile-mobile" type="tel" autoComplete="tel" {...register("mobile")} aria-invalid={Boolean(errors.mobile)} />
                  {errors.mobile ? <span className="field-error">{errors.mobile.message}</span> : null}
                </div>

                <div className="form-field md:col-span-2">
                  <label htmlFor="profile-address">Address</label>
                  <input id="profile-address" autoComplete="street-address" {...register("address")} aria-invalid={Boolean(errors.address)} />
                  {errors.address ? <span className="field-error">{errors.address.message}</span> : null}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#e5e9e2] bg-[#fbfcf8] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">SKILLS & EXPERIENCE</p>
                  <h2 className="mt-2 text-xl font-semibold text-[#152b2b]">Professional details</h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef2ff] text-[#2c3d8f]">
                  <FileText size={18} aria-hidden="true" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="form-field">
                  <label htmlFor="profile-skills">Skills</label>
                  <textarea id="profile-skills" rows={3} {...register("skills")} aria-invalid={Boolean(errors.skills)} placeholder="Data analysis, SQL, Python, communication" />
                  {errors.skills ? <span className="field-error">{errors.skills.message}</span> : null}
                </div>

                <div className="form-field">
                  <label htmlFor="profile-education">Education</label>
                  <textarea id="profile-education" rows={4} {...register("education")} aria-invalid={Boolean(errors.education)} placeholder="B.E. in Computer Science\nM.Sc. in Data Science" />
                  {errors.education ? <span className="field-error">{errors.education.message}</span> : null}
                </div>

                <div className="form-field">
                  <label htmlFor="profile-experience">Experience</label>
                  <textarea id="profile-experience" rows={4} {...register("experience")} aria-invalid={Boolean(errors.experience)} placeholder="Junior Analyst, Northstar\nProduct marketing intern, Acme" />
                  {errors.experience ? <span className="field-error">{errors.experience.message}</span> : null}
                </div>
              </div>
            </section>

            {(formError || formSuccess) ? (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${formSuccess ? "border-[#dfead9] bg-[#f2f9f3] text-[#176b55]" : "border-[#f0d8d0] bg-[#fff5f2] text-[#9a3f2f]"}`}>
                {formSuccess || formError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button type="submit" className="button button-dark" disabled={isSubmitting}>
                {isSubmitting ? <><LoaderCircle className="animate-spin" size={16} aria-hidden="true" />Saving...</> : "Save profile"}
              </button>
              <button type="button" className="button button-outline" onClick={() => reset()}>
                Reset
              </button>
            </div>
          </form>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-[#e5e9e2] bg-[#fbfcf8] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">PROFILE PHOTO</p>
                  <h2 className="mt-2 text-xl font-semibold text-[#152b2b]">Profile picture</h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf3ec] text-[#176b55]">
                  <Camera size={18} aria-hidden="true" />
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-[#dfe7dd] bg-[#eef4ee] text-2xl font-bold text-[#176b55] shadow-sm">
                  {profileImageUrl ? (
                    <Image src={profileImageUrl} alt="Profile" width={112} height={112} className="h-full w-full object-cover" unoptimized />
                  ) : (
                    <span>{getInitials(displayName)}</span>
                  )}
                </div>
              </div>

              <label htmlFor="profile-image-upload" className="button button-outline mt-4 w-full justify-center" aria-disabled={imageUploading}>
                {imageUploading ? <><LoaderCircle className="animate-spin" size={16} aria-hidden="true" />Uploading...</> : <><UploadCloud size={16} aria-hidden="true" />Upload photo</>}
              </label>
              <input id="profile-image-upload" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} />
              {imageError ? <p className="mt-3 text-sm text-[#9a3f2f]">{imageError}</p> : null}
            </section>

            <section className="rounded-2xl border border-[#e5e9e2] bg-[#fbfcf8] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">RESUME</p>
                  <h2 className="mt-2 text-xl font-semibold text-[#152b2b]">Private resume</h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef2ff] text-[#2c3d8f]">
                  <FileText size={18} aria-hidden="true" />
                </div>
              </div>

              {resumeRecord ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#dfe7dd] bg-white p-4">
                    <p className="text-sm font-semibold text-[#152b2b]">{resumeRecord.file_name}</p>
                    <div className="mt-2 space-y-1 text-xs text-[#657474]">
                      <p>Type: {resumeRecord.mime_type}</p>
                      <p>Size: {formatBytes(resumeRecord.file_size)}</p>
                      <p>Uploaded: {formatDate(resumeRecord.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="button button-outline px-3 py-2 text-xs" onClick={() => openResumeUrl("view")} disabled={resumeLoading}>
                      {resumeLoading ? <><LoaderCircle className="animate-spin" size={14} aria-hidden="true" />Opening...</> : "View"}
                    </button>
                    <button type="button" className="button button-outline px-3 py-2 text-xs" onClick={() => openResumeUrl("download")} disabled={resumeLoading}>
                      <Download size={14} aria-hidden="true" />Download
                    </button>
                    <label htmlFor="resume-upload" className="button button-outline px-3 py-2 text-xs" onClick={() => logResumeDebug("replace control clicked")}>
                      {resumeUploading ? <><LoaderCircle className="animate-spin" size={14} aria-hidden="true" />Uploading...</> : "Replace"}
                    </label>
                    <button type="button" className="button button-outline px-3 py-2 text-xs text-[#9a3f2f]" onClick={handleResumeDelete} disabled={resumeDeleting}>
                      {resumeDeleting ? <><LoaderCircle className="animate-spin" size={14} aria-hidden="true" />Deleting...</> : <><Trash2 size={14} aria-hidden="true" />Delete</>}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-dashed border-[#d9e1d5] bg-white p-5 text-center">
                    <p className="text-base font-medium text-[#152b2b]">No resume uploaded</p>
                  </div>
                  <label htmlFor="resume-upload" className="button button-dark w-full justify-center" onClick={() => logResumeDebug("upload control clicked")}>
                    {resumeUploading ? <><LoaderCircle className="animate-spin" size={16} aria-hidden="true" />Uploading...</> : <><UploadCloud size={16} aria-hidden="true" />Upload Resume</>}
                  </label>
                </div>
              )}

              <input
                id="resume-upload"
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onClick={() => logResumeDebug("file picker opened")}
                onChange={handleResumeUpload}
              />
              {resumeError ? <p className="mt-3 text-sm text-[#9a3f2f]">{resumeError}</p> : null}
            </section>

            <section className="rounded-2xl border border-[#e5e9e2] bg-[#fbfcf8] p-5">
              <p className="eyebrow">PROFILE STATUS</p>
              <div className="mt-4 rounded-2xl border border-[#dfead9] bg-[#f3faf4] p-4">
                <div className="flex items-center gap-2 text-[#176b55]">
                  <CheckCircle2 size={18} aria-hidden="true" />
                  <span className="text-sm font-semibold">Ready to work</span>
                </div>
                <p className="mt-2 text-sm text-[#657474]">Profile completion is {completion}% and your profile is protected by your authenticated Supabase session.</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
