import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Database,
  Globe2,
  LockKeyhole,
  RefreshCw,
  Server,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { ADMIN_ACTIVITY_PAGE_SIZE, getAdminSettingsData } from "@/lib/services/admin-settings";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = { title: "Admin Settings — SynSphere", robots: { index: false, follow: false } };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageHref(page: number) {
  return page > 0 ? `/admin/settings?page=${page}` : "/admin/settings";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function SectionHeading({ icon: Icon, eyebrow, title }: { icon: typeof UserRound; eyebrow: string; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-[#e7f1eb] text-[#176b55]"><Icon size={17} aria-hidden="true" /></span>
      <div><p className="text-[9px] font-bold tracking-[0.14em] text-[#176b55]">{eyebrow}</p><h2 className="mt-0.5 text-base font-semibold text-[#152b2b]">{title}</h2></div>
    </div>
  );
}

function ReadonlyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 border-t border-[#edf0eb] py-3 first:border-0 first:pt-0 sm:first:border-t sm:first:pt-3">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">{label}</dt>
      <dd className="mt-1 break-words text-sm text-[#152b2b]">{value}</dd>
    </div>
  );
}

export default async function AdminSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(first(params.page) ?? "0", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(0, Math.min(requestedPage, 10000)) : 0;
  const data = await getAdminSettingsData(page);
  const activityStart = data.activityTotal ? data.activityPage * ADMIN_ACTIVITY_PAGE_SIZE + 1 : 0;
  const activityEnd = Math.min((data.activityPage + 1) * ADMIN_ACTIVITY_PAGE_SIZE, data.activityTotal);

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-6 flex flex-col gap-3 border-b border-[#dce4dd] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">PLATFORM OPERATIONS</p><h1 className="mt-2 font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">Admin settings</h1><p className="mt-1 text-sm text-[#657474]">Account and system information. Configuration is read-only.</p></div>
        <a href={pageHref(data.activityPage)} className="inline-flex min-h-9 w-fit items-center gap-2 rounded border border-[#ccd7ce] bg-white px-3 text-xs font-semibold text-[#176b55] hover:border-[#176b55]"><RefreshCw size={14} aria-hidden="true" />Refresh</a>
      </div>

      {data.error ? <div role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{data.error}</div> : null}

      {data.admin ? (
        <>
          <div className="grid min-w-0 gap-5 xl:grid-cols-2">
            <section className="min-w-0 border border-[#e1e7e1] bg-white p-4 sm:p-5">
              <SectionHeading icon={UserRound} eyebrow="ACCOUNT" title="Admin account" />
              <dl className="grid min-w-0 gap-x-6 sm:grid-cols-2">
                <ReadonlyValue label="Name" value={data.admin.name} />
                <ReadonlyValue label="Email" value={data.admin.email} />
                <ReadonlyValue label="Role" value="Administrator" />
                <div className="min-w-0 border-t border-[#edf0eb] py-3 sm:first:border-t sm:first:pt-3">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Profile editing</dt>
                  <dd className="mt-1 text-sm text-[#152b2b]"><Link href="/profile" className="font-semibold text-[#176b55] hover:underline">Manage personal profile</Link></dd>
                </div>
              </dl>
            </section>

            <section className="min-w-0 border border-[#e1e7e1] bg-white p-4 sm:p-5">
              <SectionHeading icon={Globe2} eyebrow="PLATFORM" title="Platform information" />
              <dl className="grid min-w-0 gap-x-6 sm:grid-cols-2">
                <ReadonlyValue label="Platform" value="SynSphere x SynKode" />
                <ReadonlyValue label="Organization" value="SynSphere Technologies Pvt Ltd" />
                <ReadonlyValue label="Phone" value={<a href="tel:+917996113095" className="font-semibold text-[#176b55] hover:underline">7996113095</a>} />
                <ReadonlyValue label="Main email" value={<a href="mailto:synsphere326@gmail.com" className="break-all font-semibold text-[#176b55] hover:underline">synsphere326@gmail.com</a>} />
                <ReadonlyValue label="Information email" value={<a href="mailto:info@synsphere.in" className="break-all font-semibold text-[#176b55] hover:underline">info@synsphere.in</a>} />
                <ReadonlyValue label="Website" value={<a href="https://synsphere.in" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#176b55] hover:underline">synsphere.in</a>} />
                <ReadonlyValue label="Instagram" value={<a href="https://www.instagram.com/synsphere_technologies/" target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-[#176b55] hover:underline">@synsphere_technologies</a>} />
              </dl>
            </section>

            <section className="min-w-0 border border-[#e1e7e1] bg-white p-4 sm:p-5">
              <SectionHeading icon={LockKeyhole} eyebrow="SECURITY" title="Security information" />
              <dl className="grid min-w-0 gap-x-6 sm:grid-cols-2">
                <ReadonlyValue label="Authentication" value="Email one-time verification code (OTP)" />
                <ReadonlyValue label="Storage" value="Private buckets for user files; access is policy-controlled" />
                <ReadonlyValue label="Admin authorization" value="Verified server-side using the authenticated session and admin role" />
                <ReadonlyValue label="Security configuration" value="Managed by Supabase and deployment configuration" />
              </dl>
            </section>

            <section className="min-w-0 border border-[#e1e7e1] bg-white p-4 sm:p-5">
              <SectionHeading icon={Server} eyebrow="SYSTEM" title="System information" />
              <dl className="grid min-w-0 gap-x-6 sm:grid-cols-2">
                <ReadonlyValue label="Environment" value={data.system.environment} />
                <ReadonlyValue label="Application version" value={data.system.appVersion} />
                <ReadonlyValue label="Next.js version" value={data.system.nextVersion} />
                <div className="min-w-0 border-t border-[#edf0eb] py-3">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Database connectivity</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm text-[#152b2b]">
                    {data.system.databaseStatus === "Connected" ? <CheckCircle2 size={15} className="text-[#176b55]" aria-hidden="true" /> : <CircleAlert size={15} className="text-[#913c30]" aria-hidden="true" />}
                    {data.system.databaseStatus}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 flex items-start gap-2 border-t border-[#edf0eb] pt-3 text-[11px] leading-5 text-[#657474]"><Database className="mt-0.5 shrink-0" size={14} aria-hidden="true" />Connectivity is checked with a lightweight authenticated profile query. No database connection details or credentials are displayed.</p>
            </section>
          </div>

          <section className="mt-5 min-w-0 border border-[#e1e7e1] bg-white">
            <div className="flex flex-col gap-2 border-b border-[#e5e9e2] px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
              <div><p className="text-[9px] font-bold tracking-[0.14em] text-[#176b55]">AUDIT TRAIL</p><h2 className="mt-1 text-base font-semibold text-[#152b2b]">Recent admin activity</h2></div>
              <p className="text-[11px] text-[#657474]">Read-only · safe action, entity, and timestamp fields only</p>
            </div>
            {data.activityError ? <div role="alert" className="m-4 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{data.activityError}</div> : null}
            {!data.activityError && data.activity.length ? (
              <ul className="divide-y divide-[#edf0eb]">
                {data.activity.map((activity) => (
                  <li key={activity.id} className="flex min-w-0 flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0"><p className="break-words text-sm font-semibold text-[#152b2b]">{activity.action.replaceAll("_", " ")}</p><p className="mt-1 text-xs capitalize text-[#657474]">{activity.entity_type.replaceAll("_", " ")}</p></div>
                    <time className="shrink-0 text-[11px] text-[#657474]">{dateLabel(activity.created_at)}</time>
                  </li>
                ))}
              </ul>
            ) : null}
            {!data.activityError && !data.activity.length ? <p className="px-5 py-8 text-center text-sm text-[#657474]">No administrative activity recorded.</p> : null}
            {data.activityTotal > ADMIN_ACTIVITY_PAGE_SIZE ? (
              <nav className="flex items-center justify-between gap-3 border-t border-[#edf0eb] px-4 py-3 sm:px-5" aria-label="Admin activity pages">
                <p className="text-xs text-[#657474]">Showing {activityStart.toLocaleString("en-IN")}–{activityEnd.toLocaleString("en-IN")} of {data.activityTotal.toLocaleString("en-IN")}</p>
                <div className="flex gap-2">
                  <a aria-disabled={data.activityPage === 0} tabIndex={data.activityPage === 0 ? -1 : undefined} className={`inline-flex min-h-9 items-center gap-1 rounded border border-[#ccd7ce] px-3 text-xs font-semibold text-[#176b55] ${data.activityPage === 0 ? "pointer-events-none opacity-50" : ""}`} href={pageHref(data.activityPage - 1)}><ArrowLeft size={14} aria-hidden="true" />Previous</a>
                  <a aria-disabled={(data.activityPage + 1) * ADMIN_ACTIVITY_PAGE_SIZE >= data.activityTotal} tabIndex={(data.activityPage + 1) * ADMIN_ACTIVITY_PAGE_SIZE >= data.activityTotal ? -1 : undefined} className={`inline-flex min-h-9 items-center gap-1 rounded border border-[#ccd7ce] px-3 text-xs font-semibold text-[#176b55] ${(data.activityPage + 1) * ADMIN_ACTIVITY_PAGE_SIZE >= data.activityTotal ? "pointer-events-none opacity-50" : ""}`} href={pageHref(data.activityPage + 1)}>Next<ArrowRight size={14} aria-hidden="true" /></a>
                </div>
              </nav>
            ) : null}
          </section>

          <p className="mt-5 flex items-start gap-2 rounded border border-[#dce4dd] bg-white p-4 text-xs leading-5 text-[#657474]"><ShieldCheck className="mt-0.5 shrink-0 text-[#176b55]" size={15} aria-hidden="true" />Settings shown here are informational only. Platform configuration and security controls are managed outside the admin browser interface.</p>
        </>
      ) : null}
    </div>
  );
}
