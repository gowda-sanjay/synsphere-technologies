import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAdminNotification } from "@/lib/services/admin-notifications";

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Notification Details — SynSphere",
  robots: { index: false, follow: false },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function AdminNotificationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getAdminNotification(id);
  if (!result.notification && !result.error) notFound();

  return (
    <div className="mx-auto max-w-[1000px]">
      <Link href="/admin/notifications" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-[#176b55] hover:underline"><ArrowLeft size={14} aria-hidden="true" />All notifications</Link>
      {result.error || !result.notification ? (
        <div role="alert" className="border border-[#efc9bd] bg-[#fff5f2] p-5 text-sm text-[#913c30]">{result.error ?? "Unable to load notification."}</div>
      ) : (
        <article className="min-w-0 border border-[#e1e7e1] bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#176b55]">Notification details</p>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${result.notification.is_read ? "bg-[#f0f1ed] text-[#52616d]" : "bg-[#e7f1eb] text-[#145b48]"}`}>{result.notification.is_read ? "Read" : "Unread"}</span>
            <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[10px] font-semibold capitalize text-[#35598b]">{result.notification.type}</span>
          </div>
          <h1 className="mt-3 break-words font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">{result.notification.title}</h1>
          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-[#425252]">{result.notification.message}</p>
          <dl className="mt-6 grid min-w-0 gap-4 border-t border-[#edf0eb] pt-5 sm:grid-cols-2">
            <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Recipient</dt><dd className="mt-1 break-words text-sm text-[#152b2b]">{result.notification.recipient?.full_name?.trim() || "Unknown user"}{result.notification.recipient?.email ? ` · ${result.notification.recipient.email}` : ""}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Created</dt><dd className="mt-1 text-sm text-[#152b2b]">{formatDate(result.notification.created_at)}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#657474]">Notification ID</dt><dd className="mt-1 break-all font-mono text-xs text-[#425252]">{result.notification.id}</dd></div>
          </dl>
        </article>
      )}
    </div>
  );
}
