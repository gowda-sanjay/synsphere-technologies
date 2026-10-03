import "server-only";

import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "../../../types/database";

export const ADMIN_NOTIFICATION_PAGE_SIZE = 25;
const SEARCH_LIMIT = 10000;
const SEARCH_PAGE_LIMIT = Math.floor(SEARCH_LIMIT / ADMIN_NOTIFICATION_PAGE_SIZE);
const NOTIFICATION_TYPES = ["job", "application", "course", "placement", "system"] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type NotificationType = Database["public"]["Enums"]["notification_type"];
type Recipient = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email">;

export type AdminNotification = NotificationRow & {
  recipient: Recipient | null;
};

export type AdminNotificationFilters = {
  search?: string;
  recipient?: string;
  type?: string;
  read?: string;
  from?: string;
  to?: string;
  page?: number;
};

export type AdminNotificationListData = {
  notifications: AdminNotification[];
  recipients: Recipient[];
  total: number;
  page: number;
  hasNext: boolean;
  recipientsTruncated: boolean;
  error: string | null;
};

export type AdminNotificationDetailData = {
  notification: AdminNotification | null;
  error: string | null;
};

function emptyList(page: number, error: string | null): AdminNotificationListData {
  return {
    notifications: [],
    recipients: [],
    total: 0,
    page,
    hasNext: false,
    recipientsTruncated: false,
    error,
  };
}

function logQueryError(label: string, error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  status?: number;
}) {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[admin-notifications] ${label} failed`, {
      code: error.code ?? null,
      message: error.message ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null,
      httpStatus: error.status ?? null,
    });
  }
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_,()]/g, "\\$&");
}

async function getAdminClient() {
  if (!(await isCurrentUserAdmin())) return null;
  return createSupabaseServerClient();
}

async function findNotificationIds(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  search: string,
): Promise<{ ids: string[]; error: { code?: string; message?: string; details?: string; hint?: string; status?: number } | null; tooMany: boolean }> {
  const pattern = `%${escapeLike(search)}%`;
  const [titleResult, messageResult, recipientResult] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact" }).ilike("title", pattern).limit(SEARCH_LIMIT)
      .overrideTypes<Array<{ id: string }>, { merge: false }>(),
    supabase.from("notifications").select("id", { count: "exact" }).ilike("message", pattern).limit(SEARCH_LIMIT)
      .overrideTypes<Array<{ id: string }>, { merge: false }>(),
    supabase.from("profiles").select("id", { count: "exact" })
      .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(SEARCH_LIMIT)
      .overrideTypes<Array<{ id: string }>, { merge: false }>(),
  ]);
  const error = titleResult.error ?? messageResult.error ?? recipientResult.error;
  if (error) return { ids: [], error, tooMany: false };
  if (
    (titleResult.count ?? 0) > SEARCH_LIMIT ||
    (messageResult.count ?? 0) > SEARCH_LIMIT ||
    (recipientResult.count ?? 0) > SEARCH_LIMIT
  ) {
    return { ids: [], error: null, tooMany: true };
  }

  const recipientIds = [...new Set((recipientResult.data ?? []).map((row) => row.id))];
  let recipientNotificationIds: string[] = [];
  if (recipientIds.length) {
    const { data, error: recipientNotificationError, count } = await supabase.from("notifications")
      .select("id", { count: "exact" })
      .in("user_id", recipientIds)
      .limit(SEARCH_LIMIT)
      .overrideTypes<Array<{ id: string }>, { merge: false }>();
    if (recipientNotificationError) return { ids: [], error: recipientNotificationError, tooMany: false };
    if ((count ?? 0) > SEARCH_LIMIT) return { ids: [], error: null, tooMany: true };
    recipientNotificationIds = (data ?? []).map((row) => row.id);
  }

  const ids = [...new Set([
    ...(titleResult.data ?? []).map((row) => row.id),
    ...(messageResult.data ?? []).map((row) => row.id),
    ...recipientNotificationIds,
  ])];
  if (ids.length > SEARCH_LIMIT) return { ids: [], error: null, tooMany: true };

  return {
    ids,
    error: null,
    tooMany: false,
  };
}

export async function getAdminNotifications(filters: AdminNotificationFilters = {}): Promise<AdminNotificationListData> {
  const search = (filters.search ?? "").trim().slice(0, 100);
  const pageLimit = search ? SEARCH_PAGE_LIMIT : 10000;
  const page = Number.isSafeInteger(filters.page) && (filters.page ?? 0) >= 0
    ? Math.min(filters.page ?? 0, pageLimit)
    : 0;
  const supabase = await getAdminClient();
  if (!supabase) return emptyList(page, "Unable to load notifications.");

  const { data: recipientRows, error: recipientsError, count: recipientCount } = await supabase.from("profiles")
    .select("id,full_name,email", { count: "exact" })
    .order("full_name", { ascending: true })
    .limit(SEARCH_LIMIT)
    .overrideTypes<Recipient[], { merge: false }>();
  if (recipientsError) {
    logQueryError("Recipient options query", recipientsError);
    return emptyList(page, "Unable to load notification recipients.");
  }
  const recipients = recipientRows ?? [];

  const recipient = filters.recipient ?? "";
  const type = NOTIFICATION_TYPES.includes(filters.type as NotificationType)
    ? filters.type as NotificationType
    : "";
  const read = filters.read === "read" || filters.read === "unread" ? filters.read : "";
  const from = filters.from ?? "";
  const to = filters.to ?? "";
  if (
    (recipient && !UUID_PATTERN.test(recipient)) ||
    (from && !validDate(from)) ||
    (to && !validDate(to)) ||
    (from && to && from > to)
  ) {
    return {
      ...emptyList(page, "Choose valid notification filters."),
      recipients,
      recipientsTruncated: (recipientCount ?? 0) > SEARCH_LIMIT,
    };
  }

  let matchingIds: string[] | null = null;
  if (search) {
    const result = await findNotificationIds(supabase, search);
    if (result.error) {
      logQueryError("Search queries", result.error);
      return { ...emptyList(page, "Unable to search notifications."), recipients };
    }
    if (result.tooMany) {
      return {
        ...emptyList(page, "Too many matches. Use a more specific search."),
        recipients,
        recipientsTruncated: (recipientCount ?? 0) > SEARCH_LIMIT,
      };
    }
    matchingIds = result.ids;
    if (!matchingIds.length) {
      return {
        ...emptyList(page, null),
        recipients,
        recipientsTruncated: (recipientCount ?? 0) > SEARCH_LIMIT,
      };
    }
  }

  let query = supabase.from("notifications")
    .select("id,user_id,title,message,type,is_read,created_at,recipient:profiles!notifications_user_id_fkey(id,full_name,email)", { count: "exact" });
  if (recipient) query = query.eq("user_id", recipient);
  if (type) query = query.eq("type", type);
  if (read) query = query.eq("is_read", read === "read");
  if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (to) {
    const exclusiveEnd = new Date(`${to}T00:00:00.000Z`);
    exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
    query = query.lt("created_at", exclusiveEnd.toISOString());
  }
  if (matchingIds) query = query.in("id", matchingIds);

  const offset = page * ADMIN_NOTIFICATION_PAGE_SIZE;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + ADMIN_NOTIFICATION_PAGE_SIZE - 1)
    .overrideTypes<AdminNotification[], { merge: false }>();
  if (error) {
    logQueryError("Notification list query", error);
    return { ...emptyList(page, "Unable to load notifications."), recipients };
  }

  const total = count ?? 0;
  return {
    notifications: data ?? [],
    recipients,
    total,
    page,
    hasNext: total > offset + (data?.length ?? 0) && (!search || page < SEARCH_PAGE_LIMIT),
    recipientsTruncated: (recipientCount ?? 0) > SEARCH_LIMIT,
    error: null,
  };
}

export async function getAdminNotification(id: string): Promise<AdminNotificationDetailData> {
  if (!UUID_PATTERN.test(id)) return { notification: null, error: null };
  const supabase = await getAdminClient();
  if (!supabase) return { notification: null, error: "Unable to load this notification." };

  const { data, error } = await supabase.from("notifications")
    .select("id,user_id,title,message,type,is_read,created_at,recipient:profiles!notifications_user_id_fkey(id,full_name,email)")
    .eq("id", id)
    .limit(1)
    .overrideTypes<AdminNotification[], { merge: false }>();
  if (error) {
    logQueryError("Notification detail query", error);
    return { notification: null, error: "Unable to load this notification." };
  }
  return { notification: data?.[0] ?? null, error: null };
}

export const ADMIN_NOTIFICATION_TYPES = NOTIFICATION_TYPES;
