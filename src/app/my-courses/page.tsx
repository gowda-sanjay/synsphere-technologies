import type { Metadata } from "next";
import { ProtectedPlaceholder } from "@/components/auth/protected-placeholder";
import { requireCurrentUser } from "@/lib/auth/require-current-user";

export const metadata: Metadata = { title: "My Courses — SynKode", robots: { index: false, follow: false } };

export default async function MyCoursesPage() {
  const user = await requireCurrentUser("/my-courses");
  return <ProtectedPlaceholder title="Your learning." description="Authentication successful. Course enrollment and progress will be expanded in a later phase." email={user.email ?? "Verified email"} />;
}