"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "../../../types/database";

type MutationResult = { ok: true; id: string } | { ok: false; error: string };

const uuidSchema = z.string().uuid();
const notificationSchema = z.object({
  user_id: uuidSchema,
  title: z.string().trim().min(1, "Enter a notification title.").max(180, "Title is too long."),
  message: z.string().trim().min(1, "Enter a notification message.").max(5000, "Message is too long."),
  type: z.enum(["job", "application", "course", "placement", "system"]),
});

async function getAuthorizedContext() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false as const, error: "Notification management is unavailable." };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false as const, error: "Sign in before managing notifications." };
  if (!(await isCurrentUserAdmin())) return { ok: false as const, error: "You are not authorized to manage notifications." };
  return { ok: true as const, supabase, user: data.user };
}

async function logNotificationActivity(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  adminUserId: string,
  action: string,
  notificationId: string,
  metadata: Database["public"]["Tables"]["admin_activity_logs"]["Insert"]["metadata"],
) {
  const { error } = await supabase.from("admin_activity_logs").insert({
    admin_user_id: adminUserId,
    action,
    entity_type: "notification",
    entity_id: notificationId,
    metadata,
  });
  if (error && process.env.NODE_ENV !== "production") {
    console.error("[admin-notifications] Audit insert failed", {
      action,
      notificationId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  }
}

function revalidateNotifications(notificationId?: string, userId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/notifications");
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  if (notificationId) revalidatePath(`/admin/notifications/${notificationId}`);
  if (userId) revalidatePath(`/admin/users/${userId}`);
}

export async function createAdminNotification(submitted: unknown): Promise<MutationResult> {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false, error: context.error };
  const parsed = notificationSchema.safeParse(submitted);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the notification fields." };

  try {
    const { data, error } = await context.supabase.from("notifications")
      .insert({
        user_id: parsed.data.user_id,
        title: parsed.data.title,
        message: parsed.data.message,
        type: parsed.data.type,
        is_read: false,
      })
      .select("id,user_id,title,message,type,is_read,created_at")
      .limit(1)
      .overrideTypes<Array<Pick<Database["public"]["Tables"]["notifications"]["Row"], "id" | "user_id" | "title" | "message" | "type" | "is_read" | "created_at">>, { merge: false }>();
    const notification = data?.[0];
    if (error || !notification) {
      if (error && process.env.NODE_ENV !== "production") {
        console.error("[admin-notifications] Create failed", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
      }
      return { ok: false, error: "The notification could not be created." };
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("[admin-notifications] Notification inserted", {
        selectedRecipientUserId: parsed.data.user_id,
        insertedNotificationId: notification.id,
        insertedRecipientUserId: notification.user_id,
        recipientIdMatches: notification.user_id === parsed.data.user_id,
        type: notification.type,
        isRead: notification.is_read,
        createdAt: notification.created_at,
        titleMatchesSubmitted: notification.title === parsed.data.title,
        messageMatchesSubmitted: notification.message === parsed.data.message,
      });
    }

    await logNotificationActivity(context.supabase, context.user.id, "notification_created", notification.id, {
      recipient_id: notification.user_id,
      type: notification.type,
    });
    revalidateNotifications(notification.id, notification.user_id);
    return { ok: true, id: notification.id };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-notifications] Create action failed", error);
    return { ok: false, error: "The notification could not be created." };
  }
}

export async function setAdminNotificationReadState(notificationId: string, isRead: boolean): Promise<MutationResult> {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false, error: context.error };
  if (!uuidSchema.safeParse(notificationId).success || typeof isRead !== "boolean") {
    return { ok: false, error: "Select a valid notification state." };
  }

  try {
    const { data, error } = await context.supabase.from("notifications")
      .update({ is_read: isRead })
      .eq("id", notificationId)
      .select("id,user_id,is_read")
      .limit(1)
      .overrideTypes<Array<{ id: string; user_id: string; is_read: boolean }>, { merge: false }>();
    const notification = data?.[0];
    if (error || !notification) {
      if (error && process.env.NODE_ENV !== "production") {
        console.error("[admin-notifications] Read-state update failed", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
      }
      return { ok: false, error: "The notification state could not be updated." };
    }
    await logNotificationActivity(context.supabase, context.user.id, "notification_read_state_changed", notification.id, {
      is_read: notification.is_read,
    });
    revalidateNotifications(notification.id, notification.user_id);
    return { ok: true, id: notification.id };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-notifications] Read-state action failed", error);
    return { ok: false, error: "The notification state could not be updated." };
  }
}
