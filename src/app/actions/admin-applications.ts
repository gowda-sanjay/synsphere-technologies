"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { APPLICATION_STATUSES, getAdminApplicationResume, type AdminApplicationStatus } from "@/lib/services/admin-applications";
import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type StatusResult = { ok: true; status: AdminApplicationStatus } | { ok: false; error: string };
const statusSchema = z.enum(APPLICATION_STATUSES);
const uuidSchema = z.string().uuid();

export async function updateAdminApplicationStatus(applicationId: string, submittedStatus: string): Promise<StatusResult> {
  if (!uuidSchema.safeParse(applicationId).success) return { ok: false, error: "Application not found." };
  const statusResult = statusSchema.safeParse(submittedStatus);
  if (!statusResult.success) return { ok: false, error: "Select a valid application status." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Application management is unavailable." };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { ok: false, error: "Sign in before managing applications." };
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "You are not authorized to manage applications." };

  try {
    const { data: rows, error: readError } = await supabase.from("applications")
      .select("id,user_id,status")
      .eq("id", applicationId)
      .limit(1)
      .overrideTypes<Array<{ id: string; user_id: string; status: AdminApplicationStatus }>, { merge: false }>();
    const application = rows?.[0];
    if (readError || !application) return { ok: false, error: "Application not found." };
    if (application.status === statusResult.data) return { ok: true, status: application.status };

    const { data: updatedRows, error: updateError } = await supabase.from("applications")
      .update({ status: statusResult.data })
      .eq("id", applicationId)
      .select("id,status")
      .limit(1)
      .overrideTypes<Array<{ id: string; status: AdminApplicationStatus }>, { merge: false }>();
    const updated = updatedRows?.[0];
    if (updateError || !updated) {
      if (updateError && process.env.NODE_ENV !== "production") console.error("[admin-applications] Status update failed", { code: updateError.code, message: updateError.message });
      return { ok: false, error: "The application status could not be updated." };
    }

    const { error: auditError } = await supabase.from("admin_activity_logs").insert({
      admin_user_id: authData.user.id,
      action: "application_status_changed",
      entity_type: "application",
      entity_id: applicationId,
      metadata: { previous_status: application.status, new_status: updated.status },
    });
    if (auditError && process.env.NODE_ENV !== "production") {
      console.error("[admin-applications] Status audit insert failed", { code: auditError.code, message: auditError.message });
    }

    const label = updated.status.replaceAll("_", " ");
    const { error: notificationError } = await supabase.from("notifications").insert({
      user_id: application.user_id,
      title: "Application status updated",
      message: `Your application status is now ${label}.`,
      type: "application",
      is_read: false,
    });
    if (notificationError && process.env.NODE_ENV !== "production") {
      console.error("[admin-applications] User notification insert failed", { code: notificationError.code, message: notificationError.message });
    }

    revalidatePath("/admin/applications");
    revalidatePath(`/admin/applications/${applicationId}`);
    revalidatePath("/applications");
    revalidatePath(`/applications/${applicationId}`);
    revalidatePath("/dashboard");
    return { ok: true, status: updated.status };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-applications] Status action failed", error);
    return { ok: false, error: "The application status could not be updated." };
  }
}

export async function openAdminApplicationResume(applicationId: string) {
  if (!uuidSchema.safeParse(applicationId).success) return { error: "Resume access is unavailable." };
  return getAdminApplicationResume(applicationId);
}