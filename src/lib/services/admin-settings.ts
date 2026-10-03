import "server-only";

import appPackage from "../../../package.json";
import nextPackage from "next/package.json";
import type { Database } from "../../../types/database";
import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ADMIN_ACTIVITY_PAGE_SIZE = 10;

type ActivityLog = Pick<
  Database["public"]["Tables"]["admin_activity_logs"]["Row"],
  "id" | "action" | "entity_type" | "created_at"
>;

export type AdminSettingsData = {
  admin: { name: string; email: string; role: "admin" } | null;
  system: {
    environment: "Production" | "Development" | "Test";
    appVersion: string;
    nextVersion: string;
    databaseStatus: "Connected" | "Unavailable";
  };
  activity: ActivityLog[];
  activityTotal: number;
  activityPage: number;
  activityError: string | null;
  error: string | null;
};

function emptySettings(page: number, error: string | null): AdminSettingsData {
  return {
    admin: null,
    system: {
      environment: process.env.NODE_ENV === "production" ? "Production" : process.env.NODE_ENV === "test" ? "Test" : "Development",
      appVersion: appPackage.version,
      nextVersion: nextPackage.version,
      databaseStatus: "Unavailable",
    },
    activity: [],
    activityTotal: 0,
    activityPage: page,
    activityError: null,
    error,
  };
}

export async function getAdminSettingsData(requestedPage = 0): Promise<AdminSettingsData> {
  const page = Math.min(Math.max(0, Math.floor(Number.isFinite(requestedPage) ? requestedPage : 0)), 10000);
  if (!(await isCurrentUserAdmin())) return emptySettings(page, "You are not authorized to view admin settings.");

  const supabase = await createSupabaseServerClient();
  if (!supabase) return emptySettings(page, "Admin settings are unavailable.");

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return emptySettings(page, "Sign in to view admin settings.");

  const [profileResult, roleResult, healthResult, activityResult] = await Promise.all([
    supabase.from("profiles")
      .select("full_name")
      .eq("id", authData.user.id)
      .limit(1)
      .overrideTypes<Array<{ full_name: string }>, { merge: false }>(),
    supabase.from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id)
      .eq("role", "admin")
      .limit(1)
      .overrideTypes<Array<{ role: "admin" }>, { merge: false }>(),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("admin_activity_logs")
      .select("id,action,entity_type,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * ADMIN_ACTIVITY_PAGE_SIZE, page * ADMIN_ACTIVITY_PAGE_SIZE + ADMIN_ACTIVITY_PAGE_SIZE - 1)
      .overrideTypes<ActivityLog[], { merge: false }>(),
  ]);

  if (profileResult.error || roleResult.error) {
    const error = profileResult.error ?? roleResult.error;
    if (process.env.NODE_ENV !== "production" && error) {
      console.error("[admin-settings] Account query failed", { code: error.code, message: error.message });
    }
    return emptySettings(page, "Unable to load the current admin account.");
  }

  if (!roleResult.data?.length) return emptySettings(page, "The current account does not have the admin role.");

  if (healthResult.error && process.env.NODE_ENV !== "production") {
    console.error("[admin-settings] Database health check failed", {
      code: healthResult.error.code,
      message: healthResult.error.message,
    });
  }
  if (activityResult.error && process.env.NODE_ENV !== "production") {
    console.error("[admin-settings] Activity log query failed", {
      code: activityResult.error.code,
      message: activityResult.error.message,
    });
  }

  return {
    admin: {
      name: profileResult.data?.[0]?.full_name?.trim() || authData.user.email || "Administrator",
      email: authData.user.email ?? "Email unavailable",
      role: "admin",
    },
    system: {
      environment: process.env.NODE_ENV === "production" ? "Production" : process.env.NODE_ENV === "test" ? "Test" : "Development",
      appVersion: appPackage.version,
      nextVersion: nextPackage.version,
      databaseStatus: healthResult.error ? "Unavailable" : "Connected",
    },
    activity: activityResult.error ? [] : activityResult.data ?? [],
    activityTotal: activityResult.error ? 0 : activityResult.count ?? 0,
    activityPage: page,
    activityError: activityResult.error ? "Recent activity is temporarily unavailable." : null,
    error: null,
  };
}
