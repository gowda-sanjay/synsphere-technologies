"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, LoaderCircle } from "lucide-react";
import { openAdminApplicationResume, updateAdminApplicationStatus } from "@/app/actions/admin-applications";
import type { Database } from "../../../types/database";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];
const statuses: ApplicationStatus[] = ["applied", "under_review", "shortlisted", "interview", "selected", "rejected"];

function label(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function AdminApplicationControls({ applicationId, initialStatus, resumeAvailable, resumeFileName }: {
  applicationId: string;
  initialStatus: ApplicationStatus;
  resumeAvailable: boolean;
  resumeFileName: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [updating, setUpdating] = useState(false);
  const [openingResume, setOpeningResume] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function saveStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (updating || selectedStatus === status) return;
    setUpdating(true);
    setError("");
    setSuccess("");
    try {
      const result = await updateAdminApplicationStatus(applicationId, selectedStatus);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStatus(result.status);
      setSelectedStatus(result.status);
      setSuccess("Application status updated.");
      router.refresh();
    } catch {
      setError("The application status could not be updated.");
    } finally {
      setUpdating(false);
    }
  }

  async function openResume() {
    if (openingResume || !resumeAvailable) return;
    setOpeningResume(true);
    setError("");
    setSuccess("");
    const resumeWindow = window.open("about:blank", "_blank");
    if (resumeWindow) resumeWindow.opener = null;
    try {
      const result = await openAdminApplicationResume(applicationId);
      if ("error" in result) {
        resumeWindow?.close();
        setError(result.error);
        return;
      }
      if (resumeWindow) resumeWindow.location.assign(result.url);
      else window.location.assign(result.url);
      setSuccess(`Opening ${result.fileName}.`);
    } catch {
      resumeWindow?.close();
      setError("The resume could not be opened.");
    } finally {
      setOpeningResume(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={saveStatus} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-[#425252]">Application status
          <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as ApplicationStatus)} className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm font-normal text-[#152b2b]">
            {statuses.map((option) => <option key={option} value={option}>{label(option)}</option>)}
          </select>
        </label>
        <button type="submit" className="button button-dark min-h-10" disabled={updating || selectedStatus === status}>
          {updating ? <><LoaderCircle className="animate-spin" size={15} aria-hidden="true" />Saving...</> : "Save status"}
        </button>
      </form>

      <div className="border-t border-[#e5e9e2] pt-4">
        <p className="text-xs font-semibold text-[#425252]">Private resume</p>
        {resumeAvailable ? (
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><p className="break-words text-sm text-[#152b2b]">{resumeFileName}</p><p className="mt-1 text-xs text-[#657474]">A short-lived secure link is created only when opened.</p></div>
            <button type="button" className="button button-outline min-h-9 shrink-0 px-3" onClick={openResume} disabled={openingResume}>
              {openingResume ? <><LoaderCircle className="animate-spin" size={14} aria-hidden="true" />Opening...</> : <><Download size={14} aria-hidden="true" />Open resume</>}
            </button>
          </div>
        ) : <p className="mt-2 text-sm text-[#657474]">No resume document is linked to this application.</p>}
      </div>

      {error ? <p className="border border-[#efc9bd] bg-[#fff5f2] p-3 text-sm text-[#913c30]" role="alert">{error}</p> : null}
      {success ? <p className="border border-[#cfe4d6] bg-[#f2f9f3] p-3 text-sm text-[#145b48]" role="status">{success}</p> : null}
    </div>
  );
}