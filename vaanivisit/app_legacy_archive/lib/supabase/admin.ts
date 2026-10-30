import { createClient } from "@supabase/supabase-js";

/**
 * Privileged Supabase Server Client.
 * STRICTLY SERVER-SIDE ONLY.
 * Never import or invoke this in client components.
 */
export function getSupabaseAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("Security violation: getSupabaseAdminClient cannot be executed on the client.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wlwlbzrfazwtvsboljzp.supabase.co";
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    return null;
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

