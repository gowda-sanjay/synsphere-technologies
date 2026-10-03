"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "../../../types/database";

type AdminMutationResult = { ok: true; id: string } | { ok: false; error: string };

const jobInputSchema = z.object({
  title: z.string().trim().min(1, "Enter a job title.").max(180, "Job title is too long."),
  company_id: z.string().uuid("Select a valid company."),
  location: z.string().trim().min(1, "Enter a location.").max(180, "Location is too long."),
  job_type: z.string().trim().min(1, "Enter an employment type.").max(80, "Employment type is too long."),
  experience: z.string().trim().min(1, "Enter an experience level.").max(100, "Experience level is too long."),
  salary: z.string().trim().max(180, "Salary is too long."),
  skills: z.string().max(3000, "Skills text is too long."),
  description: z.string().trim().min(1, "Enter a job description.").max(8000, "Job description is too long."),
  responsibilities: z.string().max(8000, "Responsibilities text is too long."),
  requirements: z.string().max(8000, "Requirements text is too long."),
  vacancies: z.string().trim().regex(/^\d+$/, "Vacancies must be a whole number.").transform(Number).pipe(z.number().int().min(0).max(100000)),
  application_deadline: z.string().trim().refine((value) => {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a valid application deadline."),
});

const uuidSchema = z.string().uuid();
const splitList = (value: string) => value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);

async function getAuthorizedContext() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false as const, error: "Job management is unavailable." };

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false as const, error: "Sign in before managing jobs." };
  if (!(await isCurrentUserAdmin())) return { ok: false as const, error: "You are not authorized to manage jobs." };

  return { ok: true as const, supabase, user: data.user };
}

async function logJobActivity(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  adminUserId: string,
  action: string,
  jobId: string,
  metadata: Database["public"]["Tables"]["admin_activity_logs"]["Insert"]["metadata"],
) {
  const { error } = await supabase.from("admin_activity_logs").insert({
    admin_user_id: adminUserId,
    action,
    entity_type: "job",
    entity_id: jobId,
    metadata,
  });
  if (error && process.env.NODE_ENV !== "production") {
    console.error("[admin-jobs] Audit log insert failed", { action, jobId, code: error.code, message: error.message });
  }
}

function revalidateJobs(jobId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/jobs");
  revalidatePath("/jobs");
  if (jobId) revalidatePath(`/jobs/${jobId}`);
}

function parseJobInput(input: unknown) {
  const parsed = jobInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the job fields." };
  return {
    ok: true as const,
    value: {
      title: parsed.data.title,
      company_id: parsed.data.company_id,
      location: parsed.data.location,
      job_type: parsed.data.job_type,
      experience: parsed.data.experience,
      salary: parsed.data.salary || null,
      skills: splitList(parsed.data.skills),
      description: parsed.data.description,
      responsibilities: splitList(parsed.data.responsibilities),
      requirements: splitList(parsed.data.requirements),
      vacancies: parsed.data.vacancies,
      application_deadline: parsed.data.application_deadline || null,
    },
  } as const;
}

export async function createAdminJob(input: unknown): Promise<AdminMutationResult> {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false, error: context.error };
  const parsed = parseJobInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  try {
    const { data: company, error: companyError } = await context.supabase.from("companies")
      .select("id")
      .eq("id", parsed.value.company_id)
      .limit(1)
      .overrideTypes<Array<{ id: string }>, { merge: false }>();
    if (companyError || !company?.[0]) return { ok: false, error: "Select an existing company." };

    const { data, error } = await context.supabase.from("jobs")
      .insert({ ...parsed.value, status: "draft" })
      .select("id")
      .limit(1)
      .overrideTypes<Array<{ id: string }>, { merge: false }>();
    if (error || !data?.[0]) {
      if (error && process.env.NODE_ENV !== "production") console.error("[admin-jobs] Create failed", { code: error.code, message: error.message });
      return { ok: false, error: "The job could not be created." };
    }

    await logJobActivity(context.supabase, context.user.id, "job_created", data[0].id, { title: parsed.value.title, status: "draft" });
    revalidateJobs(data[0].id);
    return { ok: true, id: data[0].id };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-jobs] Create action failed", error);
    return { ok: false, error: "The job could not be created." };
  }
}

export async function updateAdminJob(id: string, input: unknown): Promise<AdminMutationResult> {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false, error: context.error };
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Select a valid job." };
  const parsed = parseJobInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  try {
    const { data: company, error: companyError } = await context.supabase.from("companies")
      .select("id")
      .eq("id", parsed.value.company_id)
      .limit(1)
      .overrideTypes<Array<{ id: string }>, { merge: false }>();
    if (companyError || !company?.[0]) return { ok: false, error: "Select an existing company." };

    const { data, error } = await context.supabase.from("jobs")
      .update(parsed.value)
      .eq("id", id)
      .select("id,title")
      .limit(1)
      .overrideTypes<Array<{ id: string; title: string }>, { merge: false }>();
    if (error || !data?.[0]) {
      if (error && process.env.NODE_ENV !== "production") console.error("[admin-jobs] Update failed", { jobId: id, code: error.code, message: error.message });
      return { ok: false, error: "The job could not be updated." };
    }

    await logJobActivity(context.supabase, context.user.id, "job_updated", id, { title: data[0].title });
    revalidateJobs(id);
    return { ok: true, id };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-jobs] Update action failed", error);
    return { ok: false, error: "The job could not be updated." };
  }
}

export async function setAdminJobStatus(id: string, nextStatus: "draft" | "published" | "closed"): Promise<AdminMutationResult> {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false, error: context.error };
  if (!uuidSchema.safeParse(id).success || !["draft", "published", "closed"].includes(nextStatus)) {
    return { ok: false, error: "Select a valid job status." };
  }

  try {
    const { data: rows, error: lookupError } = await context.supabase.from("jobs")
      .select("id,title,company_id,vacancies,application_deadline")
      .eq("id", id)
      .limit(1)
      .overrideTypes<Array<{ id: string; title: string; company_id: string; vacancies: number; application_deadline: string | null }>, { merge: false }>();
    const job = rows?.[0];
    if (lookupError || !job) return { ok: false, error: "The selected job could not be found." };

    if (nextStatus === "published") {
      if (job.vacancies < 1) return { ok: false, error: "Add at least one vacancy before publishing." };
      if (job.application_deadline && job.application_deadline < new Date().toISOString().slice(0, 10)) {
        return { ok: false, error: "Set a future application deadline before publishing." };
      }
      const { data: companies, error: companyError } = await context.supabase.from("companies")
        .select("status")
        .eq("id", job.company_id)
        .limit(1)
        .overrideTypes<Array<{ status: "active" | "inactive" }>, { merge: false }>();
      if (companyError || companies?.[0]?.status !== "active") {
        return { ok: false, error: "Only jobs for active companies can be published." };
      }
    }

    const { error } = await context.supabase.from("jobs").update({ status: nextStatus }).eq("id", id);
    if (error) {
      if (process.env.NODE_ENV !== "production") console.error("[admin-jobs] Status update failed", { jobId: id, code: error.code, message: error.message });
      return { ok: false, error: "The job status could not be updated." };
    }

    const action = nextStatus === "published" ? "job_published" : nextStatus === "closed" ? "job_closed" : "job_unpublished";
    await logJobActivity(context.supabase, context.user.id, action, id, { title: job.title, status: nextStatus });
    revalidateJobs(id);
    return { ok: true, id };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-jobs] Status action failed", error);
    return { ok: false, error: "The job status could not be updated." };
  }
}