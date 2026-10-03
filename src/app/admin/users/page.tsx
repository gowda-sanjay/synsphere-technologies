import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search, Users } from "lucide-react";
import { ADMIN_USER_PAGE_SIZE, getAdminUsers } from "@/lib/services/admin-users";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export const metadata: Metadata = { title: "User Management — SynSphere", robots: { index: false, follow: false } };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageHref(page: number, filters: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  if (page > 0) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters = {
    q: (first(params.q) ?? "").slice(0, 100),
    role: ["user", "admin"].includes(first(params.role) ?? "") ? first(params.role) as string : "",
    resume: ["uploaded", "missing"].includes(first(params.resume) ?? "") ? first(params.resume) as string : "",
    applications: ["has", "none"].includes(first(params.applications) ?? "") ? first(params.applications) as string : "",
  };
  const requestedPage = Number.parseInt(first(params.page) ?? "0", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(0, Math.min(requestedPage, 10000)) : 0;
  const result = await getAdminUsers({ search: filters.q, role: filters.role, resume: filters.resume, applications: filters.applications, page });
  const start = result.total ? result.page * ADMIN_USER_PAGE_SIZE + 1 : 0;
  const end = Math.min((result.page + 1) * ADMIN_USER_PAGE_SIZE, result.total);

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6 flex flex-col gap-3 border-b border-[#dce4dd] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">PLATFORM OPERATIONS</p><h1 className="mt-2 font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">User management</h1><p className="mt-1 text-sm text-[#657474]">{result.total.toLocaleString("en-IN")} registered users</p></div>
        <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-semibold text-[#176b55] hover:underline"><ArrowLeft size={14} aria-hidden="true" />Admin dashboard</Link>
      </div>

      {result.error ? <div role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{result.error}</div> : null}

      <form method="get" className="mb-5 border border-[#e1e7e1] bg-white p-4 sm:p-5" aria-label="Search and filter users">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="relative min-w-0 sm:col-span-2 xl:col-span-1"><span className="sr-only">Search name, email, or mobile</span><Search className="pointer-events-none absolute left-3 top-3 text-[#657474]" size={15} aria-hidden="true" /><input name="q" defaultValue={filters.q} maxLength={100} className="min-h-10 w-full rounded border border-[#ccd7ce] pl-9 pr-3 text-sm" placeholder="Name, email, or mobile" /></label>
          <label className="min-w-0"><span className="sr-only">Role</span><select name="role" defaultValue={filters.role} className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm"><option value="">All roles</option><option value="user">User</option><option value="admin">Admin</option></select></label>
          <label className="min-w-0"><span className="sr-only">Resume availability</span><select name="resume" defaultValue={filters.resume} className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm"><option value="">All resume states</option><option value="uploaded">Resume uploaded</option><option value="missing">No resume</option></select></label>
          <label className="min-w-0"><span className="sr-only">Applications</span><select name="applications" defaultValue={filters.applications} className="min-h-10 w-full rounded border border-[#ccd7ce] bg-white px-3 text-sm"><option value="">All application states</option><option value="has">Has applications</option><option value="none">No applications</option></select></label>
          <div className="flex flex-wrap items-end gap-2"><button type="submit" className="button button-dark min-h-10">Apply filters</button><Link href="/admin/users" className="button button-outline min-h-10">Clear</Link></div>
        </div>
      </form>

      {!result.error && result.users.length === 0 ? (
        <div className="border border-dashed border-[#d5ded6] bg-white px-5 py-12 text-center"><Users className="mx-auto text-[#176b55]" size={24} aria-hidden="true" /><h2 className="mt-3 text-base font-semibold text-[#152b2b]">No users found</h2><p className="mt-1 text-sm text-[#657474]">Try a different search or filter.</p></div>
      ) : null}

      {result.users.length ? (
        <>
          <div className="hidden overflow-x-auto border border-[#e1e7e1] bg-white lg:block">
            <table className="w-full min-w-[950px] border-collapse text-left text-xs">
              <thead className="bg-[#f3f6f2] text-[10px] uppercase tracking-[0.08em] text-[#657474]"><tr>{["User", "Mobile", "Role", "Resume", "Applications", "Registered"].map((heading) => <th key={heading} className="px-3 py-3 font-bold">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#edf0eb]">{result.users.map((user) => (
                <tr key={user.id}>
                  <td className="max-w-64 px-3 py-3"><Link href={`/admin/users/${user.id}`} className="block truncate font-semibold text-[#176b55] hover:underline">{user.full_name || "Unnamed user"}</Link><span className="mt-1 block truncate text-[#657474]">{user.email ?? "Email unavailable"}</span></td>
                  <td className="px-3 py-3 text-[#425252]">{user.mobile ?? "—"}</td>
                  <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${user.role === "admin" ? "bg-[#e7f1eb] text-[#145b48]" : "bg-[#f0f1ed] text-[#52616d]"}`}>{user.role === "admin" ? "Admin" : user.role === "user" ? "User" : "No role"}</span></td>
                  <td className="px-3 py-3 text-[#425252]">{user.resume_available ? "Uploaded" : "Not uploaded"}</td><td className="px-3 py-3 tabular-nums text-[#425252]">{user.application_count}</td><td className="whitespace-nowrap px-3 py-3 text-[#657474]">{dateLabel(user.created_at)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="grid gap-3 lg:hidden">{result.users.map((user) => (
            <article key={user.id} className="min-w-0 border border-[#e1e7e1] bg-white p-4">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-sm font-semibold text-[#152b2b]"><Link href={`/admin/users/${user.id}`} className="hover:text-[#176b55]">{user.full_name || "Unnamed user"}</Link></h2><p className="mt-1 break-all text-xs text-[#657474]">{user.email ?? "Email unavailable"}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${user.role === "admin" ? "bg-[#e7f1eb] text-[#145b48]" : "bg-[#f0f1ed] text-[#52616d]"}`}>{user.role === "admin" ? "Admin" : user.role === "user" ? "User" : "No role"}</span></div>
              <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-xs"><div><dt className="text-[#657474]">Mobile</dt><dd className="mt-0.5 break-words text-[#152b2b]">{user.mobile ?? "—"}</dd></div><div><dt className="text-[#657474]">Registered</dt><dd className="mt-0.5 text-[#152b2b]">{dateLabel(user.created_at)}</dd></div><div><dt className="text-[#657474]">Resume</dt><dd className="mt-0.5 text-[#152b2b]">{user.resume_available ? "Uploaded" : "Not uploaded"}</dd></div><div><dt className="text-[#657474]">Applications</dt><dd className="mt-0.5 text-[#152b2b]">{user.application_count}</dd></div></dl>
              <Link href={`/admin/users/${user.id}`} className="button button-outline mt-4 min-h-9 w-full">View user <ArrowRight size={13} aria-hidden="true" /></Link>
            </article>
          ))}</div>

          <nav className="mt-5 flex items-center justify-between gap-3" aria-label="User pages"><p className="text-xs text-[#657474]">Showing {start.toLocaleString("en-IN")}–{end.toLocaleString("en-IN")} of {result.total.toLocaleString("en-IN")}</p><div className="flex gap-2"><Link aria-disabled={result.page === 0} tabIndex={result.page === 0 ? -1 : undefined} className={`button button-outline min-h-9 px-3 ${result.page === 0 ? "pointer-events-none opacity-50" : ""}`} href={pageHref(result.page - 1, filters)}><ArrowLeft size={14} aria-hidden="true" />Previous</Link><Link aria-disabled={(result.page + 1) * ADMIN_USER_PAGE_SIZE >= result.total} tabIndex={(result.page + 1) * ADMIN_USER_PAGE_SIZE >= result.total ? -1 : undefined} className={`button button-outline min-h-9 px-3 ${(result.page + 1) * ADMIN_USER_PAGE_SIZE >= result.total ? "pointer-events-none opacity-50" : ""}`} href={pageHref(result.page + 1, filters)}>Next<ArrowRight size={14} aria-hidden="true" /></Link></div></nav>
        </>
      ) : null}
    </div>
  );
}