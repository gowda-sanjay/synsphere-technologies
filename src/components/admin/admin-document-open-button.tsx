"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { openAdminDocument } from "@/app/actions/admin-documents";

export function AdminDocumentOpenButton({ documentId }: { documentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function openDocument() {
    if (loading) return;
    setLoading(true);
    setError("");
    const documentWindow = window.open("about:blank", "_blank");
    if (documentWindow) documentWindow.opener = null;
    try {
      const result = await openAdminDocument(documentId);
      if ("error" in result) {
        documentWindow?.close();
        setError(result.error);
        return;
      }
      if (documentWindow) documentWindow.location.assign(result.url);
      else window.location.assign(result.url);
    } catch {
      documentWindow?.close();
      setError("The document could not be opened.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" className="button button-outline min-h-9 px-3" onClick={openDocument} disabled={loading}>
        {loading ? <><LoaderCircle className="animate-spin" size={14} aria-hidden="true" />Preparing...</> : <><Download size={14} aria-hidden="true" />View / Download</>}
      </button>
      {error ? <p role="alert" className="mt-2 text-xs text-[#913c30]">{error}</p> : null}
    </div>
  );
}
