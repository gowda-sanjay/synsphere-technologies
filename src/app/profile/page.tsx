import type { Metadata } from "next";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyProfile, type Profile } from "@/lib/services/profiles";
import { getProfileCompletionPercentage } from "@/lib/services/dashboard";

export const metadata: Metadata = { title: "My Profile — SynSphere", robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const user = await requireCurrentUser("/profile");
  const result = await getMyProfile();
  const profile = result.data ?? null;
  const completion = getProfileCompletionPercentage(profile);

  const emptyProfile: Profile = {
    id: user.id,
    full_name: "",
    email: user.email ?? null,
    mobile: null,
    address: null,
    profile_image_path: null,
    skills: [],
    education: [],
    experience: [],
    resume_path: null,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createSupabaseServerClient();
  let profileImageUrl: string | null = null;
  let resumeDocument: 
    | { id: string; user_id: string; document_type: "resume"; file_path: string; file_name: string; file_size: number; mime_type: string; created_at: string; }
    | null = null;

  if (supabase && profile?.profile_image_path) {
    const { data } = await supabase.storage.from("profile-images").createSignedUrl(profile.profile_image_path, 60);
    if (data?.signedUrl) profileImageUrl = data.signedUrl;
  }

  if (supabase) {
    const { data } = await supabase.from("user_documents")
      .select("id,user_id,document_type,file_path,file_name,file_size,mime_type,created_at")
      .eq("user_id", user.id)
      .eq("document_type", "resume")
      .order("created_at", { ascending: false })
      .limit(1)
      .overrideTypes<Array<{ id: string; user_id: string; document_type: "resume"; file_path: string; file_name: string; file_size: number; mime_type: string; created_at: string }>, { merge: false }>();

    resumeDocument = data?.[0] ?? null;
  }

  return (
    <ProfileEditor
      initialProfile={profile ?? emptyProfile}
      userEmail={user.email ?? "Verified email"}
      initialResume={resumeDocument}
      initialProfileImageUrl={profileImageUrl}
      completion={completion}
    />
  );
}