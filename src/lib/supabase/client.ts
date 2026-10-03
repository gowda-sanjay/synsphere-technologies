"use client";

import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../types/database";
import { getSupabasePublicConfig } from "./config";

type BrowserClient = ReturnType<typeof createClient<Database>>;
let browserClient: BrowserClient | null = null;
const browserFetch: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(15_000);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
};

export function createSupabaseBrowserClient(): BrowserClient | null {
  const config = getSupabasePublicConfig();
  if (!config) return null;

  browserClient ??= createBrowserClient<Database>(config.url, config.publishableKey, { global: { fetch: browserFetch } }) as unknown as BrowserClient;
  return browserClient;
}