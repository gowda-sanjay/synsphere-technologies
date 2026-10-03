"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Bell, Check, Plus, Search } from "lucide-react";
import { createAdminNotification, setAdminNotificationReadState } from "@/app/actions/admin-notifications";
import type { AdminNotificationListData } from "@/lib/services/admin-notifications";
import type { Database } from "../../../types/database";

type NotificationType = Database["public"]["Enums"]["notification_type"];

type NotificationFilters = {
  search: string;
  recipient: string;
  type: string;
  read: string;
  from: string;
  to: string;
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function typeLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function AdminNotificationManager({
  data,
  filters,
  pageSize,
}: {
  data: AdminNotificationListData;
  filters: NotificationFilters;
  pageSize: number;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<{ user_id: string; title: string; message: string; type: NotificationType }>({ user_id: "", title: "", message: "", type: "system" });

  function pageHref(page: number) {
    const params = new URLSearchParams();
    if (filters.search) params.set("q", filters.search);
    if (filters.recipient) params.set("recipient", filters.recipient);
    if (filters.type) params.set("type", filters.type);
    if (filters.read) params.set("read", filters.read);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (page > 0) params.set("page", String(page));
    const query = params.toString();
    return query ? `/admin/notifications?${query}` : "/admin/notifications";
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const result = await createAdminNotification(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setForm({ user_id: "", title: "", message: "", type: "system" });
      setFormOpen(false);
      setSuccess("Notification sent to the selected user.");
      router.refresh();
    } catch {
      setError("The notification could not be created.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRead(id: string, nextState: boolean) {
    setError("");
    setSuccess("");
    setBusyId(id);
    try {
      const result = await setAdminNotificationReadState(id, nextState);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(`Notification marked ${nextState ? "read" : "unread"}.`);
      router.refresh();
    } catch {
      setError("The notification state could not be updated.");
    } finally {
      setBusyId("");
    }
  }

  const startRow = data.total ? data.page * pageSize + 1 : 0;
  const endRow = Math.min((data.page + 1) * pageSize, data.total);
  const fieldClass = "min-h-10 min-w-0 rounded border border-[#ccd7ce] bg-white px-3 text-sm font-normal text-[#152b2b]";
  const labelClass = "grid min-w-0 gap-1.5 text-xs font-semibold text-[#425252]";

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6 flex flex-col gap-3 border-b border-[#dce4dd] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">PLATFORM OPERATIONS</p><h1 className="mt-2 font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">Notification management</h1><p className="mt-1 text-sm text-[#657474]">{data.total.toLocaleString("en-IN")} notifications</p></div>
        <button type="button" disabled={!data.recipients.length} className="button button-dark min-h-10 self-start disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto" onClick={() => setFormOpen(!formOpen)}><Plus size={16} aria-hidden="true" />{formOpen ? "Close form" : "Create notification"}</button>
      </div>

      <p className="mb-5 border border-[#e8e2c8] bg-[#fffdf2] p-3 text-xs leading-5 text-[#665d3a]">Notifications can be sent to one selected user. Broadcasts and editing are not available with this schema and the existing column-level update permissions.</p>
      {data.recipientsTruncated ? <p className="mb-5 border border-[#e8e2c8] bg-[#fffdf2] p-3 text-xs text-[#665d3a]">Recipient selection is limited to the first {data.recipients.length.toLocaleString("en-IN")} profiles.</p> : null}
      {data.error ? <div role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{data.error}</div> : null}
      {error ? <div role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{error}</div> : null}
      {success ? <div role="status" className="mb-5 flex items-center gap-2 border border-[#cfe4d6] bg-[#f2f9f3] p-4 text-sm text-[#145b48]"><Check size={15} aria-hidden="true" />{success}</div> : null}

      {formOpen ? (
        <section className="mb-6 border border-[#dce4dd] bg-white p-4 sm:p-6" aria-labelledby="notification-form-title">
          <div className="mb-5 border-b border-[#e5e9e2] pb-4"><p className="text-[9px] font-bold tracking-[0.14em] text-[#176b55]">NEW USER NOTIFICATION</p><h2 id="notification-form-title" className="mt-1 text-lg font-semibold text-[#152b2b]">Create notification</h2></div>
          <form onSubmit={submit} className="grid min-w-0 gap-4 md:grid-cols-2">
            <label className={labelClass}>Recipient
              <select required className={fieldClass} value={form.user_id} onChange={(event) => setForm({ ...form, user_id: event.target.value })}><option value="">Select a user</option>{data.recipients.map((user) => <option key={user.id} value={user.id}>{user.full_name.trim() || "Unnamed user"}{user.email ? ` — ${user.email}` : ""}</option>)}</select>
            </label>
            <label className={labelClass}>Type
              <select className={fieldClass} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as NotificationType })}><option value="job">Job</option><option value="application">Application</option><option value="course">Course</option><option value="placement">Placement</option><option value="system">System</option></select>
            </label>
            <label className={`${labelClass} md:col-span-2`}>Title
              <input required maxLength={180} className={fieldClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label className={`${labelClass} md:col-span-2`}>Message
              <textarea required maxLength={5000} rows={4} className="min-w-0 rounded border border-[#ccd7ce] bg-white px-3 py-2 text-sm font-normal leading-6 text-[#152b2b]" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
            </label>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button type="submit" disabled={saving} className="button button-dark min-h-10 disabled:cursor-wait disabled:opacity-60">{saving ? "Sending…" : "Send notification"}</button>
              <button type="button" onClick={() => setFormOpen(false)} className="min-h-10 rounded border border-[#ccd7ce] px-4 text-sm font-semibold text-[#425252]">Cancel</button>
            </div>
          </form>
        </section>
      ) : null}

      <form action="/admin/notifications" method="get" className="mb-5 grid min-w-0 gap-3 border border-[#dce4dd] bg-white p-4 sm:grid-cols-2 xl:grid-cols-7">
        <label className={`${labelClass} sm:col-span-2 xl:col-span-2`}>Search title, message, or recipient
          <span className="relative"><Search size={15} className="absolute left-3 top-3 text-[#718079]" aria-hidden="true" /><input name="q" maxLength={100} defaultValue={filters.search} placeholder="Search notifications" className="min-h-10 w-full min-w-0 rounded border border-[#ccd7ce] pl-9 pr-3 text-sm font-normal text-[#152b2b]" /></span>
        </label>
        <label className={labelClass}>Recipient
          <select name="recipient" defaultValue={filters.recipient} className={fieldClass}><option value="">All recipients</option>{data.recipients.map((user) => <option key={user.id} value={user.id}>{user.full_name.trim() || "Unnamed user"}{user.email ? ` — ${user.email}` : ""}</option>)}</select>
        </label>
        <label className={labelClass}>Type
          <select name="type" defaultValue={filters.type} className={fieldClass}><option value="">All types</option><option value="job">Job</option><option value="application">Application</option><option value="course">Course</option><option value="placement">Placement</option><option value="system">System</option></select>
        </label>
        <label className={labelClass}>Read state
          <select name="read" defaultValue={filters.read} className={fieldClass}><option value="">All states</option><option value="unread">Unread</option><option value="read">Read</option></select>
        </label>
        <label className={labelClass}>From
          <input type="date" name="from" defaultValue={filters.from} className={fieldClass} />
        </label>
        <label className={labelClass}>To
          <input type="date" name="to" defaultValue={filters.to} className={fieldClass} />
        </label>
        <button type="submit" className="button button-dark min-h-10 self-end">Apply filters</button>
      </form>

      {data.notifications.length ? (
        <div className="space-y-3">
          {data.notifications.map((notification) => (
            <article key={notification.id} className="grid min-w-0 gap-4 border border-[#e1e7e1] bg-white p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h2 className="break-words text-base font-semibold text-[#152b2b]">{notification.title}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${notification.is_read ? "bg-[#f0f1ed] text-[#52616d]" : "bg-[#e7f1eb] text-[#145b48]"}`}>{notification.is_read ? "Read" : "Unread"}</span><span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[10px] font-semibold capitalize text-[#35598b]">{typeLabel(notification.type)}</span></div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#425252]">{notification.message}</p>
                <p className="mt-2 break-words text-xs text-[#657474]">To: {notification.recipient?.full_name?.trim() || "Unknown user"}{notification.recipient?.email ? ` · ${notification.recipient.email}` : ""} · {dateLabel(notification.created_at)}</p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Link href={`/admin/notifications/${notification.id}`} className="inline-flex min-h-9 items-center rounded border border-[#ccd7ce] px-3 text-xs font-semibold text-[#425252] hover:border-[#176b55] hover:text-[#145b48]">View details</Link>
                <button type="button" disabled={busyId === notification.id} onClick={() => void toggleRead(notification.id, !notification.is_read)} className="min-h-9 rounded border border-[#ccd7ce] px-3 text-xs font-semibold capitalize text-[#425252] hover:border-[#176b55] hover:text-[#145b48] disabled:opacity-50">{busyId === notification.id ? "Updating…" : `Mark ${notification.is_read ? "unread" : "read"}`}</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-[#d5ded6] bg-white px-4 py-12 text-center"><Bell size={25} className="mx-auto text-[#8b9a91]" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-[#152b2b]">{data.error ? "Notifications could not be loaded" : "No notifications found"}</p><p className="mt-1 text-xs text-[#657474]">{data.error ? "Review the error above and try again." : "Adjust the filters or create a notification for one user."}</p></div>
      )}

      <div className="mt-5 flex flex-col gap-3 border-t border-[#dce4dd] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#657474]">Showing {startRow.toLocaleString("en-IN")}–{endRow.toLocaleString("en-IN")} of {data.total.toLocaleString("en-IN")}</p>
        <div className="flex items-center gap-2">
          <Link aria-disabled={data.page === 0} tabIndex={data.page === 0 ? -1 : undefined} className={`inline-flex min-h-9 items-center gap-1.5 rounded border px-3 text-xs font-semibold ${data.page === 0 ? "pointer-events-none border-[#e5e9e2] text-[#9aa69f]" : "border-[#ccd7ce] text-[#425252] hover:border-[#176b55]"}`} href={pageHref(Math.max(0, data.page - 1))}><ArrowLeft size={13} aria-hidden="true" />Previous</Link>
          <span className="px-2 text-xs text-[#657474]">Page {data.page + 1}</span>
          <Link aria-disabled={!data.hasNext} tabIndex={!data.hasNext ? -1 : undefined} className={`inline-flex min-h-9 items-center gap-1.5 rounded border px-3 text-xs font-semibold ${!data.hasNext ? "pointer-events-none border-[#e5e9e2] text-[#9aa69f]" : "border-[#ccd7ce] text-[#425252] hover:border-[#176b55]"}`} href={pageHref(data.page + 1)}>Next<ArrowRight size={13} aria-hidden="true" /></Link>
        </div>
      </div>
    </div>
  );
}
