import "server-only";

import type { Database } from "../../../types/database";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dataResult, SUPABASE_NOT_CONFIGURED, type DataResult } from "./result";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileUpdate = Partial<Pick<Profile,
  "full_name" | "mobile" | "address" | "profile_image_path" | "skills" | "education" | "experience" | "resume_path"
>>;

export async function getMyProfile(): Promise<DataResult<Profile | null>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return dataResult(null, "demo", SUPABASE_NOT_CONFIGURED);

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return dataResult(null, "supabase", "Sign in to view your profile.");

  const { data, error } = await supabase.from("profiles")
    .select("id,full_name,email,mobile,address,profile_image_path,skills,education,experience,resume_path,status,created_at,updated_at")
    .eq("id", authData.user.id)
    .limit(1)
    .overrideTypes<Profile[], { merge: false }>();

  if (error) return dataResult(null, "supabase", "Your profile is temporarily unavailable.");
  return dataResult(data?.[0] ?? null, "supabase");
}

export async function updateMyProfile(patch: ProfileUpdate): Promise<DataResult<Profile | null>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return dataResult(null, "demo", SUPABASE_NOT_CONFIGURED);

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return dataResult(null, "supabase", "Sign in to update your profile.");

  const { data, error } = await supabase.from("profiles")
    .update(patch)
    .eq("id", authData.user.id)
    .select("id,full_name,email,mobile,address,profile_image_path,skills,education,experience,resume_path,status,created_at,updated_at")
    .limit(1)
    .overrideTypes<Profile[], { merge: false }>();

  if (error) return dataResult(null, "supabase", "Your profile could not be updated.");
  return dataResult(data?.[0] ?? null, "supabase");
}