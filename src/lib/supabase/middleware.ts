import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { NextResponse as NextResponseFactory } from "next/server";
import type { Database } from "../../../types/database";
import { getSupabasePublicConfig } from "./config";

export async function updateSupabaseSession(request: NextRequest): Promise<{ response: NextResponse; userId: string | null }> {
  const config = getSupabasePublicConfig();
  let response = NextResponseFactory.next({ request });
  if (!config) return { response, userId: null };

  const supabase = createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<NonNullable<CookieMethodsServer["setAll"]>>[0]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponseFactory.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        response.headers.set("Cache-Control", "private, no-store, max-age=0");
        response.headers.set("Expires", "0");
        response.headers.set("Pragma", "no-cache");
      },
    },
  });

  try {
    const { data, error } = await supabase.auth.getClaims();
    const subject = data?.claims?.sub;
    return { response, userId: !error && typeof subject === "string" ? subject : null };
  } catch {
    return { response, userId: null };
  }
}