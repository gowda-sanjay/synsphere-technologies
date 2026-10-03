"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPlacementImageContentType, validatePlacementImageFile } from "@/lib/storage/placement-image-validation";
import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "../../../types/database";

type PlacementStatus = Database["public"]["Enums"]["placement_status"];
type MutationResult = { ok: true; id: string } | { ok: false; error: string };

const uuidSchema = z.string().uuid();
const placementSchema = z.object({
  candidate_name: z.string().trim().min(1, "Enter the candidate's name.").max(200, "Candidate name is too long.").optional(),
  candidate_display_name: z.string().trim().min(1, "Enter the public display name.").max(200, "Display name is too long."),
  company_id: uuidSchema,
  job_title: z.string().trim().min(1, "Enter the placement title.").max(200, "Placement title is too long."),
  course_id: z.union([uuidSchema, z.literal("")]),
  placement_year: z.number().int().min(2000).max(2200),
  description: z.string().trim().max(5000, "Description is too long."),
  status: z.enum(["draft", "published", "archived"]),
});

async function getAuthorizedContext() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false as const, error: "Placement management is unavailable." };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false as const, error: "Sign in before managing placements." };
  if (!(await isCurrentUserAdmin())) return { ok: false as const, error: "You are not authorized to manage placements." };
  return { ok: true as const, supabase, user: data.user };
}

async function logPlacementActivity(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  adminUserId: string,
  action: string,
  placementId: string,
  status: PlacementStatus,
  placementYear: number,
) {
  const { error } = await supabase.from("admin_activity_logs").insert({
    admin_user_id: adminUserId,
    action,
    entity_type: "placement",
    entity_id: placementId,
    metadata: { status, placement_year: placementYear },
  });
  if (error && process.env.NODE_ENV !== "production") {
    console.error("[admin-placements] Audit insert failed", { action, placementId, code: error.code, message: error.message });
  }
}

function revalidatePlacement(placementId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/placements");
  revalidatePath("/placements");
  if (placementId) revalidatePath(`/admin/placements/${placementId}`);
}

export async function saveAdminPlacement(
  placementId: string | null,
  submitted: unknown,
  photoFormData: FormData,
): Promise<MutationResult> {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false, error: context.error };
  if (placementId !== null && !uuidSchema.safeParse(placementId).success) {
    return { ok: false, error: "Select a valid placement." };
  }
  const parsed = placementSchema.safeParse(submitted);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the placement fields." };
  const candidateName = parsed.data.candidate_name;
  if (!placementId && parsed.data.status !== "draft") {
    return { ok: false, error: "New placements must be created as drafts, then reviewed before publishing." };
  }
  const photoValue = photoFormData.get("photo");
  if (photoValue !== null && !(photoValue instanceof File)) {
    return { ok: false, error: "Choose a valid placement photo." };
  }
  const photo = photoValue instanceof File ? photoValue : null;
  if (photo) {
    const photoError = await validatePlacementImageFile(photo);
    if (photoError) return { ok: false, error: photoError };
  }
  const values = {
    candidate_display_name: parsed.data.candidate_display_name,
    company_id: parsed.data.company_id,
    job_title: parsed.data.job_title,
    course_id: parsed.data.course_id || null,
    placement_year: parsed.data.placement_year,
    description: parsed.data.description,
    status: parsed.data.status,
  };

  try {
    let imagePath: string | null = null;
    if (photo) {
      const extension = photo.name.split(".").at(-1)?.toLowerCase() ?? "";
      const contentType = getPlacementImageContentType(photo.name);
      if (!contentType) return { ok: false, error: "Upload a JPEG, PNG, or WebP placement photo." };
      imagePath = `placements/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await context.supabase.storage.from("placement-images").upload(imagePath, photo, {
        contentType,
        upsert: false,
      });
      if (uploadError) {
        if (process.env.NODE_ENV !== "production") console.error("[admin-placements] Photo upload failed", { code: uploadError.statusCode, message: uploadError.message });
        return { ok: false, error: "The placement photo could not be uploaded." };
      }
    }

    if (placementId) {
      const { data, error } = await context.supabase.from("placements")
        .update(imagePath ? { ...values, image_path: imagePath } : values)
        .eq("id", placementId)
        .select("id,status,placement_year")
        .limit(1)
        .overrideTypes<Array<{ id: string; status: PlacementStatus; placement_year: number }>, { merge: false }>();
      if (error || !data?.[0]) {
        if (error && process.env.NODE_ENV !== "production") {
          console.error("[admin-placements] Update failed", { code: error.code, message: error.message });
        }
        return { ok: false, error: "The placement could not be updated." };
      }
      await logPlacementActivity(context.supabase, context.user.id, "placement_updated", placementId, data[0].status, data[0].placement_year);
      revalidatePlacement(placementId);
      return { ok: true, id: placementId };
    }

    if (!candidateName) return { ok: false, error: "Enter the candidate's name." };
    const { data, error } = await context.supabase.from("placements")
      .insert({ ...values, ...(imagePath ? { image_path: imagePath } : {}), candidate_name: candidateName, status: "draft" })
      .select("id,status,placement_year")
      .limit(1)
      .overrideTypes<Array<{ id: string; status: PlacementStatus; placement_year: number }>, { merge: false }>();
    if (error || !data?.[0]) {
      if (error && process.env.NODE_ENV !== "production") {
        console.error("[admin-placements] Create failed", { code: error.code, message: error.message });
      }
      return { ok: false, error: "The placement could not be created." };
    }
    await logPlacementActivity(context.supabase, context.user.id, "placement_created", data[0].id, data[0].status, data[0].placement_year);
    revalidatePlacement(data[0].id);
    return { ok: true, id: data[0].id };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-placements] Save action failed", error);
    return { ok: false, error: "The placement could not be saved." };
  }
}
