"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { validateProfileImageFile } from "@/lib/storage/profile-image-validation";
import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "../../../types/database";

type CompanyStatus = Database["public"]["Enums"]["company_status"];
type MutationResult = { ok: true; id: string } | { ok: false; error: string };
const uuidSchema = z.string().uuid();

const companySchema = z.object({
  name: z.string().trim().min(1, "Enter a company name.").max(180, "Company name is too long."),
  website: z.string().trim().max(500, "Website is too long.").refine((value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a valid HTTP or HTTPS website."),
  industry: z.string().trim().max(120, "Industry is too long."),
  location: z.string().trim().max(180, "Location is too long."),
  description: z.string().trim().max(5000, "Description is too long."),
});

async function getAuthorizedContext() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false as const, error: "Company management is unavailable." };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false as const, error: "Sign in before managing companies." };
  if (!(await isCurrentUserAdmin())) return { ok: false as const, error: "You are not authorized to manage companies." };
  return { ok: true as const, supabase, user: data.user };
}

async function logCompanyActivity(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  adminUserId: string,
  action: string,
  companyId: string,
  metadata: Database["public"]["Tables"]["admin_activity_logs"]["Insert"]["metadata"],
) {
  const { error } = await supabase.from("admin_activity_logs").insert({
    admin_user_id: adminUserId,
    action,
    entity_type: "company",
    entity_id: companyId,
    metadata,
  });
  if (error && process.env.NODE_ENV !== "production") console.error("[admin-companies] Audit insert failed", { action, companyId, code: error.code, message: error.message });
}

function revalidateCompany(companyId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/companies");
  revalidatePath("/admin/jobs");
  revalidatePath("/jobs");
  revalidatePath("/placements");
  if (companyId) revalidatePath(`/admin/companies/${companyId}`);
}

export async function saveAdminCompany(companyId: string | null, submitted: unknown): Promise<MutationResult> {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false, error: context.error };
  if (companyId !== null && !uuidSchema.safeParse(companyId).success) return { ok: false, error: "Select a valid company." };
  const parsed = companySchema.safeParse(submitted);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the company fields." };

  const values = {
    name: parsed.data.name,
    website: parsed.data.website || null,
    industry: parsed.data.industry || null,
    location: parsed.data.location || null,
    description: parsed.data.description,
  };

  try {
    if (companyId) {
      const { data, error } = await context.supabase.from("companies")
        .update(values)
        .eq("id", companyId)
        .select("id,name")
        .limit(1)
        .overrideTypes<Array<{ id: string; name: string }>, { merge: false }>();
      if (error || !data?.[0]) {
        if (error && process.env.NODE_ENV !== "production") console.error("[admin-companies] Update failed", { code: error.code, message: error.message });
        return { ok: false, error: "The company could not be updated." };
      }
      await logCompanyActivity(context.supabase, context.user.id, "company_updated", companyId, { name: data[0].name });
      revalidateCompany(companyId);
      return { ok: true, id: companyId };
    }

    const { data, error } = await context.supabase.from("companies")
      .insert({ ...values, status: "inactive" })
      .select("id,name")
      .limit(1)
      .overrideTypes<Array<{ id: string; name: string }>, { merge: false }>();
    if (error || !data?.[0]) {
      if (error && process.env.NODE_ENV !== "production") console.error("[admin-companies] Create failed", { code: error.code, message: error.message });
      return { ok: false, error: "The company could not be created." };
    }
    await logCompanyActivity(context.supabase, context.user.id, "company_created", data[0].id, { name: data[0].name, status: "inactive" });
    revalidateCompany(data[0].id);
    return { ok: true, id: data[0].id };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-companies] Save action failed", error);
    return { ok: false, error: "The company could not be saved." };
  }
}

export async function setAdminCompanyStatus(companyId: string, status: CompanyStatus): Promise<MutationResult> {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false, error: context.error };
  if (!uuidSchema.safeParse(companyId).success || (status !== "active" && status !== "inactive")) {
    return { ok: false, error: "Select a valid company status." };
  }

  try {
    const { data, error } = await context.supabase.from("companies")
      .update({ status })
      .eq("id", companyId)
      .select("id,name")
      .limit(1)
      .overrideTypes<Array<{ id: string; name: string }>, { merge: false }>();
    if (error || !data?.[0]) {
      if (error && process.env.NODE_ENV !== "production") console.error("[admin-companies] Status change failed", { code: error.code, message: error.message });
      return { ok: false, error: "The company status could not be updated." };
    }
    await logCompanyActivity(context.supabase, context.user.id, status === "active" ? "company_activated" : "company_deactivated", companyId, { name: data[0].name, status });
    revalidateCompany(companyId);
    return { ok: true, id: companyId };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-companies] Status action failed", error);
    return { ok: false, error: "The company status could not be updated." };
  }
}

export async function uploadAdminCompanyLogo(companyId: string, formData: FormData): Promise<MutationResult> {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false, error: context.error };
  if (!uuidSchema.safeParse(companyId).success) return { ok: false, error: "Select a valid company." };

  const candidate = formData.get("logo");
  if (!(candidate instanceof File)) return { ok: false, error: "Choose a logo image first." };
  const validationError = validateProfileImageFile(candidate);
  if (validationError) return { ok: false, error: validationError };

  const extension = candidate.name.split(".").at(-1)?.toLowerCase();
  const contentTypes: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  const contentType = extension ? contentTypes[extension] : null;
  if (!contentType) return { ok: false, error: "Upload a JPEG, PNG, or WebP company logo." };
  if (candidate.type && candidate.type !== contentType && !(candidate.type === "image/jpg" && contentType === "image/jpeg")) {
    return { ok: false, error: "The image MIME type does not match its extension." };
  }

  try {
    const { data: rows, error: companyError } = await context.supabase.from("companies")
      .select("logo_path")
      .eq("id", companyId)
      .limit(1)
      .overrideTypes<Array<{ logo_path: string | null }>, { merge: false }>();
    const company = rows?.[0];
    if (companyError || !company) return { ok: false, error: "The company could not be found." };

    const logoPath = `${companyId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await context.supabase.storage.from("company-logos").upload(logoPath, candidate, {
      contentType,
      upsert: false,
    });
    if (uploadError) {
      if (process.env.NODE_ENV !== "production") console.error("[admin-companies] Logo upload failed", { code: uploadError.statusCode, message: uploadError.message });
      return { ok: false, error: "The company logo could not be uploaded." };
    }

    const { error: updateError } = await context.supabase.from("companies").update({ logo_path: logoPath }).eq("id", companyId);
    if (updateError) {
      await context.supabase.storage.from("company-logos").remove([logoPath]);
      if (process.env.NODE_ENV !== "production") console.error("[admin-companies] Logo reference update failed", { code: updateError.code, message: updateError.message });
      return { ok: false, error: "The logo uploaded but could not be linked to the company." };
    }

    await logCompanyActivity(context.supabase, context.user.id, "company_logo_updated", companyId, {});
    if (company.logo_path?.startsWith(`${companyId}/`)) {
      await context.supabase.storage.from("company-logos").remove([company.logo_path]);
    }
    revalidateCompany(companyId);
    return { ok: true, id: companyId };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-companies] Logo action failed", error);
    return { ok: false, error: "The company logo could not be updated." };
  }
}