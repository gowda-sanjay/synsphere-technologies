import "server-only";

import type { Database } from "../../../types/database";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dataResult, SUPABASE_NOT_CONFIGURED, type DataResult } from "./result";

export type UserNotification = Database["public"]["Tables"]["notifications"]["Row"];

export async function getMyNotifications(): Promise<DataResult<UserNotification[]>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return dataResult([], "demo", SUPABASE_NOT_CONFIGURED);

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[notifications] Authenticated user lookup failed", {
        code: authError?.code ?? null,
        message: authError?.message ?? null,
        userPresent: Boolean(authData.user),
      });
    }
    return dataResult([], "supabase", "Sign in to view your notifications.");
  }

  const { data, error } = await supabase.from("notifications")
    .select("id,user_id,title,message,type,is_read,created_at")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false })
    .overrideTypes<UserNotification[], { merge: false }>();

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[notifications] Recipient list query failed", {
        authenticatedUserId: authData.user.id,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }
    return dataResult([], "supabase", "Notifications are temporarily unavailable.");
  }
  if (process.env.NODE_ENV !== "production") {
    console.info("[notifications] Recipient list query succeeded", {
      authenticatedUserId: authData.user.id,
      returnedCount: data?.length ?? 0,
      notificationIds: (data ?? []).map((notification) => notification.id),
      notificationUserIds: [...new Set((data ?? []).map((notification) => notification.user_id))],
      allRowsBelongToAuthenticatedUser: (data ?? []).every((notification) => notification.user_id === authData.user.id),
    });
  }
  return dataResult(data ?? [], "supabase");
}

export async function markMyNotificationRead(id: string): Promise<DataResult<boolean>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return dataResult(false, "demo", SUPABASE_NOT_CONFIGURED);

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return dataResult(false, "supabase", "Sign in to update your notifications.");

  const { data, error } = await supabase.from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", authData.user.id)
    .select("id")
    .limit(1)
    .overrideTypes<Array<{ id: string }>, { merge: false }>();

  if (error) return dataResult(false, "supabase", "The notification could not be updated.");
  return dataResult(Boolean(data?.length), "supabase", data?.length ? null : "Notification not found.");
}