import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@japangolearn/database";
import { publicEnvironment } from "./environment";
import { secureAuthStorage } from "./secure-storage";

export const supabase = createClient<Database>(
  publicEnvironment.supabaseUrl,
  publicEnvironment.supabasePublicKey,
  {
    auth: {
      // Session tokens live in the OS keystore, not plain AsyncStorage.
      storage: secureAuthStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
