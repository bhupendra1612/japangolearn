import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Database } from "@japangolearn/database";
import { publicEnvironment } from "./environment";

export const supabase = createClient<Database>(
  publicEnvironment.supabaseUrl,
  publicEnvironment.supabasePublicKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
