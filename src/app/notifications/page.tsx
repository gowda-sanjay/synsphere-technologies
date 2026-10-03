import type { Metadata } from "next";
import { UserNotificationList } from "@/components/notifications/user-notification-list";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { getMyNotifications } from "@/lib/services/notifications";

export const metadata: Metadata = { title: "Notifications — SynSphere", robots: { index: false, follow: false } };

export default async function NotificationsPage() {
  await requireCurrentUser("/notifications");
  const result = await getMyNotifications();
  return <section className="shell py-8"><UserNotificationList notifications={result.data} loadError={result.error} /></section>;
}