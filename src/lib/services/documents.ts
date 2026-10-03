"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getResumeMimeType, validateResumeFile } from "@/lib/storage/resume-validation";
import type { Database } from "../../../types/database";
import { dataResult, SUPABASE_NOT_CONFIGURED, type DataResult } from "./result";

type ResumeDocument = Pick<Database["public"]["Tables"]["user_documents"]["Row"],
  "id" | "user_id" | "document_type" | "file_path" | "file_name" | "file_size" | "mime_type" | "created_at"
>;

const documentColumns = "id,user_id,document_type,file_path,file_name,file_size,mime_type,created_at";

function logResumeDebug(stage: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[resume-debug] ${stage}`, details ?? "");
  }
}

function createResumeId(): string {
  if (typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID();

  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function uploadResume(file: File): Promise<DataResult<ResumeDocument | null>> {
  logResumeDebug("documents service started", { fileName: file.name, size: file.size, type: file.type });
  logResumeDebug("service validation started");
  const validationError = validateResumeFile(file);
  if (validationError) {
    logResumeDebug("service validation failed", { reason: validationError });
    return dataResult(null, "supabase", validationError);
  }
  logResumeDebug("service validation passed");

  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    logResumeDebug("Supabase browser client unavailable");
    return dataResult(null, "demo", SUPABASE_NOT_CONFIGURED);
  }

  logResumeDebug("requesting authenticated user");
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    logResumeDebug("authenticated user unavailable", { message: authError?.message ?? "No user returned" });
    return dataResult(null, "supabase", "Sign in before uploading a resume.");
  }
  logResumeDebug("authenticated user available");

  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "pdf";
  logResumeDebug("generating unique storage path");
  const filePath = `${authData.user.id}/${createResumeId()}.${extension}`;
  logResumeDebug("storage path generated", { path: filePath });
  const normalizedMimeType = getResumeMimeType(file) ?? "application/pdf";

  logResumeDebug("storage upload starting", {
    bucket: "resumes",
    path: filePath,
    fileName: file.name,
    size: file.size,
    type: file.type,
    contentType: normalizedMimeType,
  });
  const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, file, {
    contentType: normalizedMimeType,
    upsert: false,
  });

  if (uploadError) {
    logResumeDebug("storage upload result: failed", {
      message: uploadError.message,
      status: uploadError.status ?? null,
      statusCode: "statusCode" in uploadError ? uploadError.statusCode : null,
    });
    if (process.env.NODE_ENV !== "production") {
      console.error("[resume-upload] Storage upload failed", {
        bucket: "resumes",
        path: filePath,
        message: uploadError.message,
        status: uploadError.status ?? null,
        statusCode: "statusCode" in uploadError ? uploadError.statusCode : null,
      });
    }
    return dataResult(null, "supabase", "Resume upload failed. Please try again.");
  }
  logResumeDebug("storage upload result: succeeded", { bucket: "resumes", path: filePath });

  const safeFileName = file.name.replace(/[^\w. -]/g, "_").slice(0, 180) || `resume.${extension}`;
  logResumeDebug("database metadata insert starting", { fileName: safeFileName, size: file.size, mimeType: normalizedMimeType });
  const { data, error: documentError } = await supabase.from("user_documents")
    .insert({
      user_id: authData.user.id,
      document_type: "resume",
      file_path: filePath,
      file_name: safeFileName,
      file_size: file.size,
      mime_type: normalizedMimeType,
    })
    .select(documentColumns)
    .limit(1)
    .overrideTypes<ResumeDocument[], { merge: false }>();

  if (documentError || !data?.[0]) {
    logResumeDebug("database metadata result: failed", {
      message: documentError?.message ?? "Unknown database error",
      code: documentError?.code ?? null,
    });
    if (process.env.NODE_ENV !== "production") {
      console.error("[resume-upload] user_documents insert failed", {
        bucket: "resumes",
        path: filePath,
        message: documentError?.message ?? "Unknown database error",
        code: documentError?.code ?? null,
      });
    }
    await supabase.storage.from("resumes").remove([filePath]);
    return dataResult(null, "supabase", "Resume upload failed. Please try again.");
  }
  logResumeDebug("database metadata result: succeeded", { documentId: data[0].id });

  logResumeDebug("profile resume_path update starting");
  const { error: profileError } = await supabase.from("profiles")
    .update({ resume_path: filePath })
    .eq("id", authData.user.id);

  if (profileError) {
    logResumeDebug("profile resume_path update failed", {
      message: profileError.message,
      code: profileError.code ?? null,
    });
    if (process.env.NODE_ENV !== "production") {
      console.error("[resume-upload] profiles.resume_path update failed", {
        bucket: "resumes",
        path: filePath,
        message: profileError.message,
        code: profileError.code ?? null,
      });
    }
    await supabase.from("user_documents").delete().eq("id", data[0].id);
    await supabase.storage.from("resumes").remove([filePath]);
    return dataResult(null, "supabase", "Resume upload failed. Please try again.");
  }
  logResumeDebug("profile resume_path update succeeded");

  return dataResult(data[0], "supabase");
}

export async function createMyResumeUrl(filePath: string): Promise<DataResult<string | null>> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return dataResult(null, "demo", SUPABASE_NOT_CONFIGURED);

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || !filePath.startsWith(`${authData.user.id}/`)) {
    return dataResult(null, "supabase", "Resume access is not available.");
  }

  const { data: documents, error: documentError } = await supabase.from("user_documents")
    .select("file_path")
    .eq("user_id", authData.user.id)
    .eq("document_type", "resume")
    .eq("file_path", filePath)
    .limit(1)
    .overrideTypes<Array<{ file_path: string }>, { merge: false }>();

  if (documentError || !documents?.length) return dataResult(null, "supabase", "Resume access is not available.");
  const { data, error } = await supabase.storage.from("resumes").createSignedUrl(filePath, 60);
  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[resume-upload] Signed URL generation failed", {
        bucket: "resumes",
        path: filePath,
        message: error.message,
        status: error.status ?? null,
        statusCode: "statusCode" in error ? error.statusCode : null,
      });
    }
    return dataResult(null, "supabase", "A secure resume link could not be created.");
  }
  return dataResult(data.signedUrl, "supabase");
}

export async function deleteMyResume(filePath: string): Promise<DataResult<boolean>> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return dataResult(false, "demo", SUPABASE_NOT_CONFIGURED);

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || !filePath.startsWith(`${authData.user.id}/`)) {
    return dataResult(false, "supabase", "Resume access is not available.");
  }

  const { data: documents, error: documentError } = await supabase.from("user_documents")
    .select("id,file_path")
    .eq("user_id", authData.user.id)
    .eq("document_type", "resume")
    .eq("file_path", filePath)
    .limit(1)
    .overrideTypes<Array<{ id: string; file_path: string }>, { merge: false }>();

  const document = documents?.[0];
  if (documentError || !document) return dataResult(false, "supabase", "Resume access is not available.");

  const { error: removeError } = await supabase.storage.from("resumes").remove([filePath]);
  if (removeError) return dataResult(false, "supabase", "The resume file could not be deleted.");

  const { error: deleteError } = await supabase.from("user_documents").delete().eq("id", document.id);
  if (deleteError) return dataResult(false, "supabase", "The resume record could not be deleted.");

  const { error: profileError } = await supabase.from("profiles")
    .update({ resume_path: null })
    .eq("id", authData.user.id)
    .eq("resume_path", filePath);
  if (profileError) return dataResult(false, "supabase", "The resume was deleted but the profile reference could not be cleared.");

  return dataResult(true, "supabase");
}