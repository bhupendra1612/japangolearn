import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@japangolearn/database";
import { publicEnvironment } from "@/lib/environment";

/**
 * Creates a Supabase client suitable for use at build time
 * (e.g., in generateStaticParams) where there is no request/cookie context.
 */
export function createStaticClient() {
  return createSupabaseClient<Database>(
    publicEnvironment.supabaseUrl,
    publicEnvironment.supabasePublicKey
  );
}
