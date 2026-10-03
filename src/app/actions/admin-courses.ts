"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { validateProfileImageFile } from "@/lib/storage/profile-image-validation";
import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "../../../types/database";

type CourseStatus = Database["public"]["Enums"]["course_status"];
type MutationResult = { ok: true; id: string } | { ok: false; error: string };
const uuidSchema = z.string().uuid();

const courseSchema = z.object({
  title: z.string().trim().min(1, "Enter a course title.").max(180, "Course title is too long."),
  description: z.string().trim().min(1, "Enter a course description.").max(12000, "Course description is too long."),
  category: z.string().trim().min(1, "Enter a course category.").max(120, "Category is too long."),
  duration: z.string().trim().min(1, "Enter a duration.").max(80, "Duration is too long."),
  price: z.string().trim().default("0").refine((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 10000000;
  }, "Price must be a valid non-negative number."),
  level: z.string().trim().min(1, "Select a course level.").max(80, "Level is too long."),
  skills: z.string().max(5000, "Skills text is too long."),
  curriculum: z.string().max(20000, "Curriculum text is too long."),
  requirements: z.string().max(5000, "Requirements text is too long."),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

function splitList(value: string) {
  return value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
}

async function getAuthorizedContext() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false as const, error: "Course management is unavailable." };

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false as const, error: "Sign in before managing courses." };
  if (!(await isCurrentUserAdmin())) return { ok: false as const, error: "You are not authorized to manage courses." };

  return { ok: true as const, supabase, user: data.user };
}

async function logCourseActivity(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  adminUserId: string,
  action: string,
  courseId: string,
  metadata: Database["public"]["Tables"]["admin_activity_logs"]["Insert"]["metadata"],
) {
  const { error } = await supabase.from("admin_activity_logs").insert({
    admin_user_id: adminUserId,
    action,
    entity_type: "course",
    entity_id: courseId,
    metadata,
  });
  if (error && process.env.NODE_ENV !== "production") {
    console.error("[admin-courses] Audit log insert failed", { action, courseId, code: error.code, message: error.message });
  }
}

function revalidateCourses(courseId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/courses");
  if (courseId) revalidatePath(`/admin/courses/${courseId}`);
}

export async function saveAdminCourse(courseId: string | null, submitted: unknown): Promise<MutationResult> {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false, error: context.error };
  if (courseId !== null && !uuidSchema.safeParse(courseId).success) return { ok: false, error: "Select a valid course." };

  const parsed = courseSchema.safeParse(submitted);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the course fields." };

  const values = {
    title: parsed.data.title,
    description: parsed.data.description,
    category: parsed.data.category,
    duration: parsed.data.duration,
    price: Number(parsed.data.price) || 0,
    level: parsed.data.level,
    skills: splitList(parsed.data.skills),
    curriculum: splitList(parsed.data.curriculum),
    requirements: splitList(parsed.data.requirements),
    status: parsed.data.status,
  };

  try {
    if (courseId) {
      const { data, error } = await context.supabase.from("courses")
        .update(values)
        .eq("id", courseId)
        .select("id,title")
        .limit(1)
        .overrideTypes<Array<{ id: string; title: string }>, { merge: false }>();

      if (error || !data?.[0]) {
        if (error && process.env.NODE_ENV !== "production") console.error("[admin-courses] Update failed", { code: error.code, message: error.message });
        return { ok: false, error: "The course could not be updated." };
      }

      await logCourseActivity(context.supabase, context.user.id, "course_updated", courseId, { title: data[0].title });
      revalidateCourses(courseId);
      return { ok: true, id: courseId };
    }

    const { data, error } = await context.supabase.from("courses")
      .insert({ ...values, status: "draft" })
      .select("id,title")
      .limit(1)
      .overrideTypes<Array<{ id: string; title: string }>, { merge: false }>();

    if (error || !data?.[0]) {
      if (error && process.env.NODE_ENV !== "production") console.error("[admin-courses] Create failed", { code: error.code, message: error.message });
      return { ok: false, error: "The course could not be created." };
    }

    await logCourseActivity(context.supabase, context.user.id, "course_created", data[0].id, { title: data[0].title, status: "draft" });
    revalidateCourses(data[0].id);
    return { ok: true, id: data[0].id };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-courses] Save action failed", error);
    return { ok: false, error: "The course could not be saved." };
  }
}

export async function setAdminCourseStatus(courseId: string, nextStatus: CourseStatus): Promise<MutationResult> {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false, error: context.error };
  if (!uuidSchema.safeParse(courseId).success || !["draft", "published", "archived"].includes(nextStatus)) {
    return { ok: false, error: "Select a valid course status." };
  }

  try {
    const { data, error } = await context.supabase.from("courses")
      .update({ status: nextStatus })
      .eq("id", courseId)
      .select("id,title")
      .limit(1)
      .overrideTypes<Array<{ id: string; title: string }>, { merge: false }>();

    if (error || !data?.[0]) {
      if (error && process.env.NODE_ENV !== "production") console.error("[admin-courses] Status update failed", { code: error.code, message: error.message });
      return { ok: false, error: "The course status could not be updated." };
    }

    await logCourseActivity(context.supabase, context.user.id, nextStatus === "published" ? "course_published" : nextStatus === "draft" ? "course_drafted" : "course_archived", courseId, { title: data[0].title, status: nextStatus });
    revalidateCourses(courseId);
    return { ok: true, id: courseId };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-courses] Status action failed", error);
    return { ok: false, error: "The course status could not be updated." };
  }
}

export async function uploadAdminCourseImage(courseId: string, formData: FormData): Promise<MutationResult> {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false, error: context.error };
  if (!uuidSchema.safeParse(courseId).success) return { ok: false, error: "Select a valid course." };

  const candidate = formData.get("image");
  if (!(candidate instanceof File)) return { ok: false, error: "Choose a course image first." };

  const imageError = validateProfileImageFile(candidate);
  if (imageError) return { ok: false, error: imageError };

  const extension = candidate.name.split(".").at(-1)?.toLowerCase();
  const contentTypes: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  const contentType = extension ? contentTypes[extension] : null;
  if (!contentType) return { ok: false, error: "Upload a JPEG, PNG, or WebP course image." };
  if (candidate.type && candidate.type !== contentType && !(candidate.type === "image/jpg" && contentType === "image/jpeg")) {
    return { ok: false, error: "The image MIME type does not match its extension." };
  }

  try {
    const { data: rows, error: courseError } = await context.supabase.from("courses")
      .select("image_path")
      .eq("id", courseId)
      .limit(1)
      .overrideTypes<Array<{ image_path: string | null }>, { merge: false }>();

    const course = rows?.[0];
    if (courseError || !course) return { ok: false, error: "The course could not be found." };

    const imagePath = `${courseId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await context.supabase.storage.from("course-images").upload(imagePath, candidate, {
      contentType,
      upsert: false,
    });

    if (uploadError) {
      if (process.env.NODE_ENV !== "production") console.error("[admin-courses] Image upload failed", { code: uploadError.statusCode, message: uploadError.message });
      return { ok: false, error: "The course image could not be uploaded." };
    }

    const { error: updateError } = await context.supabase.from("courses").update({ image_path: imagePath }).eq("id", courseId);
    if (updateError) {
      await context.supabase.storage.from("course-images").remove([imagePath]);
      if (process.env.NODE_ENV !== "production") console.error("[admin-courses] Image reference update failed", { code: updateError.code, message: updateError.message });
      return { ok: false, error: "The image uploaded but could not be linked to the course." };
    }

    await logCourseActivity(context.supabase, context.user.id, "course_image_updated", courseId, {});
    if (course.image_path?.startsWith(`${courseId}/`)) {
      await context.supabase.storage.from("course-images").remove([course.image_path]);
    }
    revalidateCourses(courseId);
    return { ok: true, id: courseId };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-courses] Image action failed", error);
    return { ok: false, error: "The course image could not be updated." };
  }
}
