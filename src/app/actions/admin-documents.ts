"use server";

import { getAdminDocumentSignedUrl } from "@/lib/services/admin-documents";
import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function openAdminDocument(documentId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Document access is unavailable." };

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { error: "Sign in before opening a document." };
  if (!(await isCurrentUserAdmin())) return { error: "You are not authorized to open this document." };

  return getAdminDocumentSignedUrl(documentId);
}
