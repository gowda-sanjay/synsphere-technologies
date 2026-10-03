"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { markNotificationRead } from "@/app/actions/notifications";
import type { UserNotification } from "@/lib/services/notifications";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function UserNotificationList({
  notifications,
  loadError,
}: {
  notifications: UserNotification[];
  loadError: string | null;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState("");
  const [actionError, setActionError] = useState("");

  async function markRead(id: string) {
    setActionError("");
    setBusyId(id);
    try {
      const result = await markNotificationRead(id);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setActionError("The notification could not be updated.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-6 border-b border-[#dce4dd] pb-5">
        <p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">YOUR ACCOUNT</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-[#152b2b] sm:text-3xl">Notifications</h1>
        <p className="mt-1 text-sm text-[#657474]">Updates sent to your account.</p>
      </div>
      {loadError ? <div role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{loadError}</div> : null}
      {actionError ? <div role="alert" className="mb-5 border border-[#efc9bd] bg-[#fff5f2] p-4 text-sm text-[#913c30]">{actionError}</div> : null}
      {notifications.length ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <article key={notification.id} className={`min-w-0 border p-4 sm:p-5 ${notification.is_read ? "border-[#e1e7e1] bg-white" : "border-[#cfe4d6] bg-[#f8fcf7]"}`}>
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="break-words text-base font-semibold text-[#152b2b]">{notification.title}</h2><span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[10px] font-semibold capitalize text-[#35598b]">{notification.type}</span>{!notification.is_read ? <span className="rounded-full bg-[#e7f1eb] px-2.5 py-1 text-[10px] font-semibold text-[#145b48]">Unread</span> : null}</div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#425252]">{notification.message}</p>
                  <time className="mt-3 block text-xs text-[#657474]">{formatDate(notification.created_at)}</time>
                </div>
                {!notification.is_read ? <button type="button" disabled={busyId === notification.id} onClick={() => void markRead(notification.id)} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 self-start rounded border border-[#ccd7ce] px-3 text-xs font-semibold text-[#425252] hover:border-[#176b55] hover:text-[#145b48] disabled:opacity-50">{busyId === notification.id ? "Updating…" : <><Check size={13} aria-hidden="true" />Mark read</>}</button> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-[#d5ded6] bg-white px-4 py-12 text-center"><Bell size={25} className="mx-auto text-[#8b9a91]" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-[#152b2b]">{loadError ? "Notifications unavailable" : "You’re all caught up"}</p><p className="mt-1 text-xs text-[#657474]">{loadError ? "Try refreshing the page." : "New updates for your account will appear here."}</p></div>
      )}
      <Link href="/dashboard" className="mt-6 inline-flex text-xs font-semibold text-[#176b55] hover:underline">Back to dashboard</Link>
    </section>
  );
}
