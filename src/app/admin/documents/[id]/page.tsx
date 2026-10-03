import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { AdminDocumentOpenButton } from "@/components/admin/admin-document-open-button";
import { getAdminDocumentDetail } from "@/lib/services/admin-documents";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };
export const metadata: Metadata = { title: "Document Details — SynSphere", robots: { index: false, follow: false } };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminDocumentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getAdminDocumentDetail(id);
  if (!result.data && !result.error) notFound();
  if (result.error || !result.data) {
    return <div role="alert" className="mx-auto max-w-4xl border border-[#efc9bd] bg-[#fff5f2] p-5 text-sm text-[#913c30]">{result.error ?? "Unable to load document."}</div>;
  }

  const document = result.data;
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/documents" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-[#176b55] hover:underline"><ArrowLeft size={14} aria-hidden="true" />All documents</Link>
      <section className="border border-[#e1e7e1] bg-white p-5 sm:p-7">
        <div className="flex min-w-0 items-start gap-3 border-b border-[#edf0eb] pb-5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e7f1eb] text-[#145b48]"><FileText size={20} aria-hidden="true" /></span><div className="min-w-0"><p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">DOCUMENT DETAILS</p><h1 className="mt-1 break-words font-display text-xl font-semibold text-[#152b2b] sm:text-2xl">{document.file_name}</h1></div></div>
        <dl className="mt-5 grid min-w-0 gap-5 sm:grid-cols-2">
          <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">User</dt><dd className="mt-1 break-words text-sm text-[#152b2b]">{document.user?.full_name || "Unnamed user"}</dd></div>
          <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Email</dt><dd className="mt-1 break-all text-sm text-[#152b2b]">{document.user?.email ?? "Email unavailable"}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Mobile</dt><dd className="mt-1 text-sm text-[#152b2b]">{document.user?.mobile ?? "Not provided"}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Document type</dt><dd className="mt-1 text-sm capitalize text-[#152b2b]">{document.document_type.replaceAll("_", " ")}</dd></div>
          <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">MIME type</dt><dd className="mt-1 break-all text-sm text-[#152b2b]">{document.mime_type}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">File size</dt><dd className="mt-1 text-sm text-[#152b2b]">{formatSize(document.file_size)}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Uploaded</dt><dd className="mt-1 text-sm text-[#152b2b]">{formatDate(document.created_at)}</dd></div>
        </dl>
        <div className="mt-6 border-t border-[#edf0eb] pt-5">
          {document.document_type === "resume" || document.document_type === "profile_image" ? <AdminDocumentOpenButton documentId={document.id} /> : <p className="text-sm text-[#657474]">Secure viewing is not currently configured for this document type.</p>}
        </div>
      </section>
    </div>
  );
}
