"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signupProfileMetadataSchema } from "@/lib/validations/auth";
import { getAuthErrorMessage } from "@/lib/auth/error-message";
import type { Database } from "../../../types/database";

type ProfileIdRow = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id">;

export async function completeEmailOtpProfile(submittedProfile?: unknown): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Authentication is unavailable. Please try again later." };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;
  if (authError || !user || !user.email) {
    return { ok: false, error: "Your session has expired. Please request a new verification code." };
  }

  const submitted = signupProfileMetadataSchema.safeParse(submittedProfile);
  const { data: existingRows, error: lookupError } = await supabase.from("profiles")
    .select("id")
    .eq("id", user.id)
    .limit(1)
    .overrideTypes<ProfileIdRow[], { merge: false }>();

  if (lookupError) return { ok: false, error: getAuthErrorMessage(lookupError, "profile") };

  if (existingRows?.length && submitted.success) {
    const { error } = await supabase.from("profiles")
      .update({
        full_name: submitted.data.full_name,
        mobile: submitted.data.mobile,
        address: submitted.data.address,
        skills: submitted.data.skills,
        education: submitted.data.education,
        experience: submitted.data.experience,
      })
      .eq("id", user.id);

    if (error) return { ok: false, error: getAuthErrorMessage(error, "profile") };
  } else if (!existingRows?.length) {
    const fullName = submitted.success
      ? submitted.data.full_name
      : typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      full_name: fullName,
      email: user.email,
      mobile: submitted.success ? submitted.data.mobile : null,
      address: submitted.success ? submitted.data.address : null,
      skills: submitted.success ? submitted.data.skills : [],
      education: submitted.success ? submitted.data.education : [],
      experience: submitted.success ? submitted.data.experience : [],
    });

    if (error) return { ok: false, error: getAuthErrorMessage(error, "profile") };
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return { ok: true };
}