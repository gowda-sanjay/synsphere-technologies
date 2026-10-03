import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText, Search } from "lucide-react";
import { ADMIN_DOCUMENT_PAGE_SIZE, getAdminDocuments } from "@/lib/services/admin-documents";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export const metadata: Metadata = { title: "Document Management — SynSphere", robots: { index: false, follow: false } };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageHref(page: number, filters: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  if (page > 0) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/documents?${query}` : "/admin/documents";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function sizeLabel(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function documentLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function AdminDocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters = {
    q: (first(params.q) ?? "").slice(0, 100),
    type: ["resume", "profile_image", "portfolio", "other"].includes(first(params.type) ?? "") ? first(params.type)! : "",
    file: ["pdf", "word", "image"].includes(first(params.file) ?? "") ? first(params.file)! : "",
    from: first(params.from) ?? "",
    to: first(params.to) ?? "",
  };
  const requestedPage = Number.parseInt(first(params.page) ?? "0", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(0, Math.min(requestedPage, 10000)) : 0;
  const result = await getAdminDocuments({
    search: filters.q,
    documentType: filters.type,
    fileType: filters.file,
    dateFrom: filters.from,
    dateTo: filters.to,
    page,
  });
  const start = result.total ? result.page * ADMIN_DOCUMENT_PAGE_SIZE + 1 : 0;
  const end = Math.min((result.page + 1) * ADMIN_DOCUMENT_PAGE_SIZE, result.total);

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6 flex flex-col gap-3 border-b border-[#dce4dd] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">PLATFORM OPERATIONS</p><h1 className="mt-2 font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">Document management</h1><p className="mt-1 text-sm text-[#657474]">{result.total.toLocaleString("en-IN")} documents</p></div>
        <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-semibold text-[#176b55] hover:underline"><ArrowLeft size={14} aria-hidden="true" />Admin dashboard</Link>
      </div>

      {result.error ? <div role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{result.error}</div> : null}

      <form method="get" className="mb-5 border border-[#e1e7e1] bg-white p-4 sm:p-5" aria-label="Search and filter documents">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="relative min-w-0 sm:col-span-2 xl:col-span-1"><span className="sr-only">Search user name or email</span><Search className="pointer-events-none absolute left-3 top-3 text-[#657474]" size={15} aria-hidden="true" /><input name="q" defaultValue={filters.q} maxLength={100} className="min-h-10 w-full rounded border border-[#ccd7ce] pl-9 pr-3 text-sm" placeholder="User name or email" /></label>
          <label className="min-w-0"><span className="sr-only">Document type</span><select name="type" defaultValue={filters.type} className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm"><option value="">All document types</option><option value="resume">Resume</option><option value="profile_image">Profile image</option><option value="portfolio">Portfolio</option><option value="other">Other</option></select></label>
          <label className="min-w-0"><span className="sr-only">File type</span><select name="file" defaultValue={filters.file} className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm"><option value="">All file types</option><option value="pdf">PDF</option><option value="word">Word document</option><option value="image">Image</option></select></label>
          <label className="min-w-0"><span className="sr-only">Uploaded after</span><input aria-label="Uploaded after" type="date" name="from" defaultValue={filters.from} className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm" /></label>
          <label className="min-w-0"><span className="sr-only">Uploaded before</span><input aria-label="Uploaded before" type="date" name="to" defaultValue={filters.to} className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm" /></label>
          <div className="flex flex-wrap items-end gap-2"><button type="submit" className="button button-dark min-h-10">Apply filters</button><Link href="/admin/documents" className="button button-outline min-h-10">Clear</Link></div>
        </div>
      </form>

      {!result.error && result.documents.length === 0 ? (
        <div className="border border-dashed border-[#d5ded6] bg-white px-5 py-12 text-center"><FileText className="mx-auto text-[#176b55]" size={24} aria-hidden="true" /><h2 className="mt-3 text-base font-semibold text-[#152b2b]">No documents found</h2><p className="mt-1 text-sm text-[#657474]">Try a different search or filter.</p></div>
      ) : null}

      {result.documents.length ? (
        <>
          <div className="hidden overflow-x-auto border border-[#e1e7e1] bg-white lg:block">
            <table className="w-full min-w-[900px] border-collapse text-left text-xs">
              <thead className="bg-[#f3f6f2] text-[10px] uppercase tracking-[0.08em] text-[#657474]"><tr>{["User", "Document", "Type", "File", "Size", "Uploaded", ""].map((heading, index) => <th key={`${heading}-${index}`} className="px-3 py-3 font-bold">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#edf0eb]">{result.documents.map((document) => (
                <tr key={document.id}>
                  <td className="max-w-56 px-3 py-3"><p className="truncate font-semibold text-[#152b2b]">{document.user?.full_name || "Unnamed user"}</p><p className="mt-1 truncate text-[#657474]">{document.user?.email ?? "Email unavailable"}</p></td>
                  <td className="max-w-56 px-3 py-3"><Link href={`/admin/documents/${document.id}`} className="block truncate font-semibold text-[#176b55] hover:underline">{document.file_name}</Link></td>
                  <td className="px-3 py-3 text-[#425252]">{documentLabel(document.document_type)}</td>
                  <td className="px-3 py-3 text-[#425252]">{document.mime_type}</td><td className="whitespace-nowrap px-3 py-3 text-[#425252]">{sizeLabel(document.file_size)}</td><td className="whitespace-nowrap px-3 py-3 text-[#657474]">{dateLabel(document.created_at)}</td>
                  <td className="px-3 py-3"><Link href={`/admin/documents/${document.id}`} className="font-semibold text-[#176b55] hover:underline">Details</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="grid gap-3 lg:hidden">{result.documents.map((document) => (
            <article key={document.id} className="min-w-0 border border-[#e1e7e1] bg-white p-4">
              <div className="min-w-0"><h2 className="break-words text-sm font-semibold text-[#152b2b]">{document.file_name}</h2><p className="mt-1 break-words text-xs text-[#657474]">{document.user?.full_name || "Unnamed user"}</p><p className="break-all text-xs text-[#657474]">{document.user?.email ?? "Email unavailable"}</p></div>
              <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-xs"><div><dt className="text-[#657474]">Document type</dt><dd className="mt-0.5 text-[#152b2b]">{documentLabel(document.document_type)}</dd></div><div><dt className="text-[#657474]">Size</dt><dd className="mt-0.5 text-[#152b2b]">{sizeLabel(document.file_size)}</dd></div><div className="col-span-2"><dt className="text-[#657474]">File type</dt><dd className="mt-0.5 break-all text-[#152b2b]">{document.mime_type}</dd></div><div className="col-span-2"><dt className="text-[#657474]">Uploaded</dt><dd className="mt-0.5 text-[#152b2b]">{dateLabel(document.created_at)}</dd></div></dl>
              <Link href={`/admin/documents/${document.id}`} className="button button-outline mt-4 min-h-9 w-full">View details</Link>
            </article>
          ))}</div>

          <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Document pages"><p className="text-xs text-[#657474]">Showing {start.toLocaleString("en-IN")}–{end.toLocaleString("en-IN")} of {result.total.toLocaleString("en-IN")}</p><div className="flex gap-2"><Link aria-disabled={result.page === 0} tabIndex={result.page === 0 ? -1 : undefined} className={`button button-outline min-h-9 px-3 ${result.page === 0 ? "pointer-events-none opacity-50" : ""}`} href={pageHref(result.page - 1, filters)}><ArrowLeft size={14} aria-hidden="true" />Previous</Link><Link aria-disabled={(result.page + 1) * ADMIN_DOCUMENT_PAGE_SIZE >= result.total} tabIndex={(result.page + 1) * ADMIN_DOCUMENT_PAGE_SIZE >= result.total ? -1 : undefined} className={`button button-outline min-h-9 px-3 ${(result.page + 1) * ADMIN_DOCUMENT_PAGE_SIZE >= result.total ? "pointer-events-none opacity-50" : ""}`} href={pageHref(result.page + 1, filters)}>Next<ArrowRight size={14} aria-hidden="true" /></Link></div></nav>
        </>
      ) : null}
    </div>
  );
}
