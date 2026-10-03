import type { Metadata } from "next";
import { AdminNotificationManager } from "@/components/admin/admin-notification-manager";
import { ADMIN_NOTIFICATION_PAGE_SIZE, getAdminNotifications } from "@/lib/services/admin-notifications";

export const metadata: Metadata = {
  title: "Notification Management — SynSphere",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AdminNotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters = {
    search: first(params.q).slice(0, 100),
    recipient: first(params.recipient),
    type: first(params.type),
    read: first(params.read),
    from: first(params.from),
    to: first(params.to),
  };
  const requestedPage = Number.parseInt(first(params.page) || "0", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(0, Math.min(requestedPage, 10000)) : 0;
  const data = await getAdminNotifications({ ...filters, page });

  return <AdminNotificationManager data={data} filters={filters} pageSize={ADMIN_NOTIFICATION_PAGE_SIZE} />;
}
