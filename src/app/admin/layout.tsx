import { notFound } from "next/navigation";
import { AdminFrame } from "@/components/admin/admin-frame";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireCurrentUser("/admin");
  let isAdmin = false;
  try {
    isAdmin = await isCurrentUserAdmin();
  } catch {
    notFound();
  }
  if (!isAdmin) notFound();

  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();

  const { data: profiles } = await supabase.from("profiles")
    .select("full_name,profile_image_path")
    .eq("id", user.id)
    .limit(1)
    .overrideTypes<Array<{ full_name: string; profile_image_path: string | null }>, { merge: false }>();

  const profile = profiles?.[0];
  let avatarUrl: string | null = null;
  if (profile?.profile_image_path) {
    const { data } = await supabase.storage.from("profile-images").createSignedUrl(profile.profile_image_path, 60);
    avatarUrl = data?.signedUrl ?? null;
  }

  return (
    <AdminFrame
      adminName={profile?.full_name?.trim() || user.email || "Administrator"}
      adminEmail={user.email ?? "Verified administrator"}
      avatarUrl={avatarUrl}
    >
      {children}
    </AdminFrame>
  );
}