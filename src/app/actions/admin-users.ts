"use server";

import { getAdminUserResume } from "@/lib/services/admin-users";
import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function openAdminUserResume(profileId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Resume access is unavailable." };

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { error: "Sign in before opening a resume." };
  if (!(await isCurrentUserAdmin())) return { error: "You are not authorized to open this resume." };

  return getAdminUserResume(profileId);
}