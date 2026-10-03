import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeReturnPath } from "@/lib/auth/redirects";

export async function requireCurrentUser(returnPath: string): Promise<User> {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    redirect(`/login?reason=unavailable&next=${encodeURIComponent(getSafeReturnPath(returnPath))}`);
  }

  if (!supabase) redirect("/login?reason=unavailable");

  let data;
  let error;
  try {
    ({ data, error } = await supabase.auth.getUser());
  } catch {
    redirect(`/login?reason=unavailable&next=${encodeURIComponent(getSafeReturnPath(returnPath))}`);
  }

  if (error || !data.user) {
    redirect(`/login?next=${encodeURIComponent(getSafeReturnPath(returnPath))}`);
  }
  return data.user;
}