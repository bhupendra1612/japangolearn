import fs from "node:fs";
import path from "node:path";
import type { FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export default async function globalSetup(_config: FullConfig) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Local Supabase environment is missing.");

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const password = "E2e-password-123!";
  const regular = await admin.auth.admin.createUser({
    email: `learner-${suffix}@example.test`,
    password,
    email_confirm: true,
    user_metadata: { display_name: "E2E Learner" },
  });
  const administrator = await admin.auth.admin.createUser({
    email: `admin-${suffix}@example.test`,
    password,
    email_confirm: true,
    user_metadata: { display_name: "E2E Admin" },
  });
  if (regular.error || administrator.error || !regular.data.user || !administrator.data.user) {
    throw regular.error ?? administrator.error ?? new Error("Unable to create E2E users");
  }

  const roleUpdate = await admin
    .from("profiles")
    .update({ role: "admin", onboarding_completed: true })
    .eq("id", administrator.data.user.id);
  if (roleUpdate.error) throw roleUpdate.error;
  await admin
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", regular.data.user.id);

  const output = path.resolve(".logs", "e2e-users.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(
    output,
    JSON.stringify({
      regular: { id: regular.data.user.id, email: regular.data.user.email, password },
      admin: {
        id: administrator.data.user.id,
        email: administrator.data.user.email,
        password,
      },
    })
  );
}
