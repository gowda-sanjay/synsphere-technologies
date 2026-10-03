import "server-only";

import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ADMIN_DOCUMENT_PAGE_SIZE = 20;

export type AdminDocumentFilters = {
  search?: string;
  documentType?: string;
  fileType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
};

export type AdminDocumentRow = {
  id: string;
  user_id: string;
  document_type: "resume" | "profile_image" | "portfolio" | "other";
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  user: { full_name: string; email: string | null; mobile: string | null } | null;
};

export type AdminDocumentDetail = AdminDocumentRow;

type DocumentDbRow = Omit<AdminDocumentRow, "user"> & {
  user: AdminDocumentRow["user"] | AdminDocumentRow["user"][];
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function mapDocument(row: DocumentDbRow): AdminDocumentRow {
  return {
    id: row.id,
    user_id: row.user_id,
    document_type: row.document_type,
    file_name: row.file_name,
    file_size: row.file_size,
    mime_type: row.mime_type,
    created_at: row.created_at,
    user: Array.isArray(row.user) ? row.user[0] ?? null : row.user,
  };
}

function emptyList(page: number, error: string | null = null) {
  return { documents: [] as AdminDocumentRow[], total: 0, page, error };
}

function isValidDate(value: string | undefined): value is string {
  return Boolean(value && datePattern.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));
}

export async function getAdminDocuments(filters: AdminDocumentFilters = {}) {
  const requestedPage = Number.isFinite(filters.page) ? Math.max(0, Math.floor(filters.page!)) : 0;
  const page = Math.min(requestedPage, 10000);
  if (!(await isCurrentUserAdmin())) return emptyList(page, "You are not authorized to view documents.");

  const supabase = await createSupabaseServerClient();
  if (!supabase) return emptyList(page, "Document access is unavailable.");

  let matchedUserIds: string[] | null = null;
  const search = filters.search?.trim().slice(0, 100) ?? "";
  if (search) {
    const [nameResult, emailResult] = await Promise.all([
      supabase.from("profiles").select("id").ilike("full_name", `%${search}%`).limit(1000),
      supabase.from("profiles").select("id").ilike("email", `%${search}%`).limit(1000),
    ]);
    if (nameResult.error || emailResult.error) {
      return emptyList(page, "Unable to search document owners.");
    }
    matchedUserIds = [...new Set([...(nameResult.data ?? []), ...(emailResult.data ?? [])].map((row) => row.id))];
    if (!matchedUserIds.length) return emptyList(page);
  }

  let query = supabase.from("user_documents")
    .select("id,user_id,document_type,file_name,file_size,mime_type,created_at,user:profiles!user_documents_user_id_fkey(full_name,email,mobile)", { count: "exact" });
  if (matchedUserIds) query = query.in("user_id", matchedUserIds);
  if (["resume", "profile_image", "portfolio", "other"].includes(filters.documentType ?? "")) {
    query = query.eq("document_type", filters.documentType as "resume" | "profile_image" | "portfolio" | "other");
  }
  if (filters.fileType === "pdf") query = query.eq("mime_type", "application/pdf");
  if (filters.fileType === "word") {
    query = query.in("mime_type", ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
  }
  if (filters.fileType === "image") query = query.in("mime_type", ["image/jpeg", "image/png", "image/webp"]);
  if (isValidDate(filters.dateFrom)) query = query.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
  if (isValidDate(filters.dateTo)) query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);

  const from = page * ADMIN_DOCUMENT_PAGE_SIZE;
  const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, from + ADMIN_DOCUMENT_PAGE_SIZE - 1)
    .overrideTypes<DocumentDbRow[], { merge: false }>();
  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-documents] List query failed", { code: error.code, message: error.message });
    return emptyList(page, "Unable to load documents.");
  }

  return { documents: (data ?? []).map(mapDocument), total: count ?? 0, page, error: null };
}

export async function getAdminDocumentDetail(documentId: string): Promise<{ data: AdminDocumentDetail | null; error: string | null }> {
  if (!uuidPattern.test(documentId) || !(await isCurrentUserAdmin())) return { data: null, error: "You are not authorized to view this document." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { data: null, error: "Document access is unavailable." };

  const { data, error } = await supabase.from("user_documents")
    .select("id,user_id,document_type,file_name,file_size,mime_type,created_at,user:profiles!user_documents_user_id_fkey(full_name,email,mobile)")
    .eq("id", documentId)
    .maybeSingle()
    .overrideTypes<DocumentDbRow | null, { merge: false }>();
  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[admin-documents] Detail query failed", { code: error.code, message: error.message });
    return { data: null, error: "Unable to load document details." };
  }
  return data ? { data: mapDocument(data), error: null } : { data: null, error: null };
}

export async function getAdminDocumentSignedUrl(documentId: string): Promise<{ url: string; fileName: string } | { error: string }> {
  if (!uuidPattern.test(documentId) || !(await isCurrentUserAdmin())) return { error: "You are not authorized to open this document." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Document access is unavailable." };

  const { data: document, error: documentError } = await supabase.from("user_documents")
    .select("user_id,document_type,file_path,file_name")
    .eq("id", documentId)
    .limit(1)
    .overrideTypes<Array<{ user_id: string; document_type: "resume" | "profile_image" | "portfolio" | "other"; file_path: string; file_name: string }>, { merge: false }>();
  const foundDocument = document?.[0];
  if (documentError || !foundDocument) return { error: "The document could not be found." };
  const bucket = foundDocument.document_type === "resume"
    ? "resumes"
    : foundDocument.document_type === "profile_image"
      ? "profile-images"
      : null;
  if (!bucket || !foundDocument.file_path.startsWith(`${foundDocument.user_id}/`)) {
    return { error: "Secure viewing is not supported for this document type." };
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(foundDocument.file_path, 60);
  if (error || !data?.signedUrl) {
    if (error && process.env.NODE_ENV !== "production") console.error("[admin-documents] Signed URL creation failed", { code: error.statusCode, message: error.message });
    return { error: "A secure document link could not be created." };
  }
  return { url: data.signedUrl, fileName: foundDocument.file_name };
}
