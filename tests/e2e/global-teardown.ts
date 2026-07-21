import fs from "node:fs";
import path from "node:path";
import type { FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export default async function globalTeardown(_config: FullConfig) {
  const usersFile = path.resolve(".logs", "e2e-users.json");
  if (!fs.existsSync(usersFile)) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  const users = JSON.parse(fs.readFileSync(usersFile, "utf8"));
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await Promise.all(
    [users.regular?.id, users.admin?.id]
      .filter(Boolean)
      .map((userId: string) => admin.auth.admin.deleteUser(userId))
  );
  fs.rmSync(usersFile, { force: true });
}
