import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@japangolearn/database";
import { publicEnvironment } from "@/lib/environment";

export function createClient() {
  return createBrowserClient<Database>(
    publicEnvironment.supabaseUrl,
    publicEnvironment.supabasePublicKey
  );
}
