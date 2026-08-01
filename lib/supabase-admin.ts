import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    "Missing server-side Supabase environment variables.",
  );
}

/*
 * Server-only Supabase client.
 *
 * Never import this file into a Client Component.
 * Never rename SUPABASE_SECRET_KEY to a NEXT_PUBLIC_* variable.
 */
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
