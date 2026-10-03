"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { openAdminUserResume } from "@/app/actions/admin-users";

export function AdminUserResumeButton({ profileId }: { profileId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function openResume() {
    if (loading) return;
    setLoading(true);
    setError("");
    const resumeWindow = window.open("about:blank", "_blank");
    if (resumeWindow) resumeWindow.opener = null;
    try {
      const result = await openAdminUserResume(profileId);
      if ("error" in result) {
        resumeWindow?.close();
        setError(result.error);
        return;
      }
      if (resumeWindow) resumeWindow.location.assign(result.url);
      else window.location.assign(result.url);
    } catch {
      resumeWindow?.close();
      setError("The resume could not be opened.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" className="button button-outline min-h-9 px-3" onClick={openResume} disabled={loading}>
        {loading ? <><LoaderCircle className="animate-spin" size={14} aria-hidden="true" />Opening...</> : <><Download size={14} aria-hidden="true" />Open resume</>}
      </button>
      {error ? <p role="alert" className="mt-2 text-xs text-[#913c30]">{error}</p> : null}
    </div>
  );
}