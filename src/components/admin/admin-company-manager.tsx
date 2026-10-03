"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Edit3, ExternalLink, Plus, Search, X } from "lucide-react";
import { saveAdminCompany, setAdminCompanyStatus, uploadAdminCompanyLogo } from "@/app/actions/admin-companies";

type Company = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  location: string | null;
  description: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  logo_url: string | null;
  job_count: number;
  application_count: number;
};
type CompanyForm = { name: string; website: string; industry: string; location: string; description: string };
const emptyForm: CompanyForm = { name: "", website: "", industry: "", location: "", description: "" };

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

export function AdminCompanyManager({ initialCompanies, total, page, pageSize, search, status, loadError }: {
  initialCompanies: Company[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  status: string;
  loadError: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<CompanyForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [busyCompany, setBusyCompany] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function startCreate() {
    clearMessages();
    setEditingId(null);
    setLogoFile(null);
    setForm({ ...emptyForm });
  }

  function startEdit(company: Company) {
    clearMessages();
    setEditingId(company.id);
    setLogoFile(null);
    setForm({ name: company.name, website: company.website ?? "", industry: company.industry ?? "", location: company.location ?? "", description: company.description });
  }

  async function saveCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || saving) return;
    clearMessages();
    setSaving(true);
    try {
      const result = await saveAdminCompany(editingId, form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (editingId) {
        setSuccess("Company updated.");
        setForm(null);
        setEditingId(null);
      } else {
        setEditingId(result.id);
        setSuccess("Company created as inactive. Add a logo if needed, then activate it when ready.");
      }
      router.refresh();
    } catch {
      setError("The company could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId || !logoFile || logoBusy) return;
    clearMessages();
    setLogoBusy(true);
    try {
      const formData = new FormData();
      formData.set("logo", logoFile);
      const result = await uploadAdminCompanyLogo(editingId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Company logo updated.");
      setLogoFile(null);
      router.refresh();
    } catch {
      setError("The company logo could not be uploaded.");
    } finally {
      setLogoBusy(false);
    }
  }

  async function toggleStatus(company: Company) {
    const nextStatus = company.status === "active" ? "inactive" : "active";
    if (company.status === "active" && !window.confirm(`Deactivate ${company.name}? Its jobs remain intact but no longer appear publicly.`)) return;
    clearMessages();
    setBusyCompany(company.id);
    try {
      const result = await setAdminCompanyStatus(company.id, nextStatus);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(nextStatus === "active" ? "Company activated." : "Company deactivated.");
      router.refresh();
    } catch {
      setError("The company status could not be changed.");
    } finally {
      setBusyCompany(null);
    }
  }

  const startRow = total ? page * pageSize + 1 : 0;
  const endRow = Math.min((page + 1) * pageSize, total);
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (status) params.set("status", status);
    if (nextPage > 0) params.set("page", String(nextPage));
    const query = params.toString();
    return query ? `/admin/companies?${query}` : "/admin/companies";
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6 flex flex-col gap-3 border-b border-[#dce4dd] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">PLATFORM OPERATIONS</p><h1 className="mt-2 font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">Company management</h1><p className="mt-1 text-sm text-[#657474]">{total.toLocaleString("en-IN")} companies</p></div>
        <button type="button" className="button button-dark min-h-10 self-start sm:self-auto" onClick={() => form ? setForm(null) : startCreate()}>{form ? <X size={15} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}{form ? "Cancel" : "Add Company"}</button>
      </div>

      {loadError ? <div role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{loadError}</div> : null}
      {error ? <div role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{error}</div> : null}
      {success ? <div role="status" className="mb-5 flex items-center gap-2 border border-[#cfe4d6] bg-[#f2f9f3] p-4 text-sm text-[#145b48]"><Check size={15} aria-hidden="true" />{success}</div> : null}

      {form ? (
        <section className="mb-6 border border-[#dce4dd] bg-white p-4 sm:p-6" aria-labelledby="company-form-title">
          <div className="mb-5 border-b border-[#e5e9e2] pb-4"><p className="text-[9px] font-bold tracking-[0.14em] text-[#176b55]">COMPANY DETAILS</p><h2 id="company-form-title" className="mt-1 text-lg font-semibold text-[#152b2b]">{editingId ? "Edit company" : "Add a company"}</h2></div>
          <form onSubmit={saveCompany} className="grid min-w-0 gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252]">Company name<input required maxLength={180} className="min-h-10 min-w-0 rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252]">Website<input type="url" maxLength={500} placeholder="https://example.com" className="min-h-10 min-w-0 rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252]">Industry<input maxLength={120} className="min-h-10 min-w-0 rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252]">Location<input maxLength={180} className="min-h-10 min-w-0 rounded border border-[#ccd7ce] px-3 text-sm font-normal text-[#152b2b]" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#425252] md:col-span-2">Description<textarea maxLength={5000} rows={5} className="min-w-0 rounded border border-[#ccd7ce] px-3 py-2 text-sm font-normal text-[#152b2b]" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <div className="flex flex-wrap gap-3 border-t border-[#e5e9e2] pt-4 md:col-span-2"><button className="button button-dark min-h-10" type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Save changes" : "Create inactive company"}</button><button type="button" className="button button-outline min-h-10" onClick={() => { setForm(null); setEditingId(null); }} disabled={saving}>Cancel</button></div>
          </form>
          {editingId ? <form onSubmit={uploadLogo} className="mt-5 flex flex-col gap-3 border-t border-[#e5e9e2] pt-5 sm:flex-row sm:items-end"><label className="grid min-w-0 flex-1 gap-1.5 text-xs font-semibold text-[#425252]">Company logo (JPEG, PNG, WebP; max 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} className="min-h-10 w-full min-w-0 rounded border border-[#ccd7ce] px-3 py-2 text-xs font-normal" /></label><button type="submit" className="button button-outline min-h-10" disabled={!logoFile || logoBusy}>{logoBusy ? "Uploading..." : "Upload logo"}</button></form> : null}
        </section>
      ) : null}

      <form method="get" className="mb-5 grid gap-3 border border-[#e1e7e1] bg-white p-4 sm:grid-cols-[minmax(0,1fr)_220px_auto_auto] sm:items-end" aria-label="Search and filter companies">
        <label className="relative min-w-0"><span className="sr-only">Search name, location, or website</span><Search className="pointer-events-none absolute left-3 top-3 text-[#657474]" size={15} aria-hidden="true" /><input name="q" defaultValue={search} maxLength={100} className="min-h-10 w-full rounded border border-[#ccd7ce] pl-9 pr-3 text-sm" placeholder="Name, location, website" /></label>
        <label className="min-w-0"><span className="sr-only">Company status</span><select name="status" defaultValue={status} className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm"><option value="">All states</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <button className="button button-dark min-h-10" type="submit">Apply filters</button><Link href="/admin/companies" className="button button-outline min-h-10">Clear</Link>
      </form>

      {initialCompanies.length === 0 && !loadError ? <div className="border border-dashed border-[#d5ded6] bg-white px-5 py-12 text-center"><Building2 className="mx-auto text-[#176b55]" size={24} aria-hidden="true" /><h2 className="mt-3 text-base font-semibold text-[#152b2b]">No companies found</h2><p className="mt-1 text-sm text-[#657474]">Try another search or filter.</p></div> : null}

      {initialCompanies.length ? <>
        <div className="hidden overflow-x-auto border border-[#e1e7e1] bg-white lg:block"><table className="w-full min-w-[1050px] border-collapse text-left text-xs">
          <thead className="bg-[#f3f6f2] text-[10px] uppercase tracking-[0.08em] text-[#657474]"><tr>{["Company", "Location", "Website", "Description", "Jobs", "Applications", "State", "Created", "Actions"].map((heading) => <th key={heading} className="px-3 py-3 font-bold">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#edf0eb]">{initialCompanies.map((company) => <tr key={company.id}>
            <td className="max-w-56 px-3 py-3"><div className="flex items-center gap-2">{company.logo_url ? <Image src={company.logo_url} alt="" width={32} height={32} unoptimized className="h-8 w-8 shrink-0 rounded border border-[#e1e7e1] object-contain" /> : null}<div className="min-w-0"><Link href={`/admin/companies/${company.id}`} className="block truncate font-semibold text-[#176b55] hover:underline">{company.name}</Link>{company.industry ? <span className="mt-1 block truncate text-[#657474]">{company.industry}</span> : null}</div></div></td>
            <td className="px-3 py-3 text-[#425252]">{company.location || "—"}</td><td className="max-w-48 px-3 py-3">{company.website ? <a href={company.website} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-[#176b55] hover:underline"><span className="truncate">{company.website}</span><ExternalLink size={11} aria-hidden="true" /></a> : <span className="text-[#657474]">—</span>}</td><td className="max-w-64 px-3 py-3 text-[#657474]">{company.description || "—"}</td><td className="px-3 py-3 tabular-nums text-[#425252]">{company.job_count}</td><td className="px-3 py-3 tabular-nums text-[#425252]">{company.application_count}</td>
            <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${company.status === "active" ? "bg-[#e7f1eb] text-[#145b48]" : "bg-[#f0f1ed] text-[#52616d]"}`}>{company.status}</span></td><td className="whitespace-nowrap px-3 py-3 text-[#657474]">{dateLabel(company.created_at)}</td><td className="px-3 py-3"><div className="flex gap-2"><button type="button" className="inline-flex min-h-9 items-center gap-1 rounded border border-[#dce4dd] px-2.5 text-xs font-semibold text-[#425252]" onClick={() => startEdit(company)}><Edit3 size={13} aria-hidden="true" />Edit</button><button type="button" className="min-h-9 rounded border border-[#dce4dd] px-2.5 text-xs font-semibold text-[#425252]" onClick={() => toggleStatus(company)} disabled={busyCompany === company.id}>{busyCompany === company.id ? "Updating..." : company.status === "active" ? "Deactivate" : "Activate"}</button><Link href={`/admin/companies/${company.id}`} className="inline-flex min-h-9 items-center rounded border border-[#dce4dd] px-2.5 text-xs font-semibold text-[#425252]">View</Link></div></td>
          </tr>)}</tbody>
        </table></div>
        <div className="grid gap-3 lg:hidden">{initialCompanies.map((company) => <article key={company.id} className="min-w-0 border border-[#e1e7e1] bg-white p-4">
          <div className="flex items-start gap-3">{company.logo_url ? <Image src={company.logo_url} alt="" width={44} height={44} unoptimized className="h-11 w-11 shrink-0 rounded border border-[#e1e7e1] object-contain" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded bg-[#e7f1eb] text-[#145b48]"><Building2 size={19} aria-hidden="true" /></span>}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h2 className="break-words text-sm font-semibold text-[#152b2b]">{company.name}</h2><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${company.status === "active" ? "bg-[#e7f1eb] text-[#145b48]" : "bg-[#f0f1ed] text-[#52616d]"}`}>{company.status}</span></div>{company.industry ? <p className="mt-1 text-xs text-[#657474]">{company.industry}</p> : null}</div></div>
          <p className="mt-3 line-clamp-2 text-xs text-[#657474]">{company.description || "No description"}</p><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-[#657474]">Location</dt><dd className="mt-0.5 text-[#152b2b]">{company.location || "—"}</dd></div><div><dt className="text-[#657474]">Created</dt><dd className="mt-0.5 text-[#152b2b]">{dateLabel(company.created_at)}</dd></div><div><dt className="text-[#657474]">Jobs</dt><dd className="mt-0.5 text-[#152b2b]">{company.job_count}</dd></div><div><dt className="text-[#657474]">Applications</dt><dd className="mt-0.5 text-[#152b2b]">{company.application_count}</dd></div></dl>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[#edf0eb] pt-3"><button type="button" className="button button-outline min-h-9 px-3" onClick={() => startEdit(company)}><Edit3 size={13} aria-hidden="true" />Edit</button><button type="button" className="button button-outline min-h-9 px-3" onClick={() => toggleStatus(company)} disabled={busyCompany === company.id}>{busyCompany === company.id ? "Updating..." : company.status === "active" ? "Deactivate" : "Activate"}</button><Link href={`/admin/companies/${company.id}`} className="button button-outline min-h-9 px-3">View</Link></div>
        </article>)}</div>
        <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Company pages"><p className="text-xs text-[#657474]">Showing {startRow.toLocaleString("en-IN")}–{endRow.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}</p><div className="flex gap-2"><Link aria-disabled={page === 0} tabIndex={page === 0 ? -1 : undefined} className={`button button-outline min-h-9 px-3 ${page === 0 ? "pointer-events-none opacity-50" : ""}`} href={pageHref(page - 1)}><ArrowLeft size={14} aria-hidden="true" />Previous</Link><Link aria-disabled={(page + 1) * pageSize >= total} tabIndex={(page + 1) * pageSize >= total ? -1 : undefined} className={`button button-outline min-h-9 px-3 ${(page + 1) * pageSize >= total ? "pointer-events-none opacity-50" : ""}`} href={pageHref(page + 1)}>Next<ArrowRight size={14} aria-hidden="true" /></Link></div></nav>
      </> : null}
    </div>
  );
}