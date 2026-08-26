import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@japangolearn/database";
import { cookies } from "next/headers";
import { publicEnvironment } from "@/lib/environment";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnvironment.supabaseUrl,
    publicEnvironment.supabasePublicKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components can read refreshed cookies but cannot always set them.
          }
        },
      },
    }
  );
}
