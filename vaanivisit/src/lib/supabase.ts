import { createClient, SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url =
    (import.meta as any).env?.VITE_SUPABASE_URL ||
    "https://wlwlbzrfazwtvsboljzp.supabase.co";
  const anonKey =
    (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_IqnTtw8qtmdUHCJHFm2ZbA_hu8qRlXF";

  if (!anonKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}

