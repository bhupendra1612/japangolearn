#!/usr/bin/env node
const postgres = require("postgres");
const { getLocalSupabaseStatus, readStatusValue } = require("./local-supabase-env");

async function main() {
  const status = getLocalSupabaseStatus();
  const databaseUrl =
    process.env.SUPABASE_DB_URL ?? readStatusValue(status, "DB_URL", "db_url", "database_url");
  if (!databaseUrl) throw new Error("Could not resolve the local Supabase database URL.");

  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const [rlsFailures, unsafeDefiners, unsafeFunctionGrants, unsafeTableGrants, storagePolicies] =
      await Promise.all([
        sql`
          select c.relname as table_name
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relkind in ('r', 'p')
            and not c.relrowsecurity
          order by c.relname
        `,
        sql`
          select n.nspname as schema_name, p.proname as function_name
          from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
          where p.prosecdef
            and n.nspname in ('public', 'private')
            and not exists (
              select 1
              from unnest(coalesce(p.proconfig, array[]::text[])) setting
              where setting in ('search_path=""', 'search_path=', 'search_path=pg_catalog')
            )
        `,
        sql`
          select
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as arguments,
            case
              when privilege.grantee = 0 then 'PUBLIC'
              else pg_get_userbyid(privilege.grantee)
            end as role_name
          from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
          cross join lateral aclexplode(
            coalesce(p.proacl, acldefault('f', p.proowner))
          ) as privilege
          where p.prosecdef
            and n.nspname in ('public', 'private')
            and privilege.privilege_type = 'EXECUTE'
            and (
              privilege.grantee = 0
              or pg_get_userbyid(privilege.grantee) = 'anon'
            )
        `,
        sql`
          select table_name, grantee, privilege_type
          from information_schema.table_privileges
          where table_schema = 'public'
            and grantee in ('anon', 'authenticated')
            and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
            and table_name in (
              'learning_attempts',
              'learning_attempt_answers',
              'activity_events',
              'xp_ledger',
              'mastery_records',
              'daily_quest_completions',
              'activity_log',
              'daily_goals',
              'user_achievements',
              'user_level_progress',
              'user_kana_progress',
              'user_kanji_progress',
              'user_streaks'
            )
        `,
        sql`
          select count(*)::integer as count
          from pg_policies
          where schemaname = 'storage'
            and tablename = 'objects'
            and policyname in (
              'avatar_owner_select',
              'avatar_owner_insert',
              'avatar_owner_update',
              'avatar_owner_delete'
            )
        `,
      ]);

    const failures = [];
    if (rlsFailures.length) {
      failures.push(`Tables without RLS: ${rlsFailures.map((row) => row.table_name).join(", ")}`);
    }
    if (unsafeDefiners.length) {
      failures.push(
        `SECURITY DEFINER functions without fixed search_path: ${unsafeDefiners
          .map((row) => `${row.schema_name}.${row.function_name}`)
          .join(", ")}`
      );
    }
    if (unsafeFunctionGrants.length) {
      failures.push(
        `Unsafe SECURITY DEFINER grants: ${unsafeFunctionGrants
          .map(
            (row) => `${row.schema_name}.${row.function_name}(${row.arguments})=>${row.role_name}`
          )
          .join(", ")}`
      );
    }
    if (unsafeTableGrants.length) {
      failures.push(
        `Unsafe server-owned table grants: ${unsafeTableGrants
          .map((row) => `${row.table_name}:${row.privilege_type}=>${row.grantee}`)
          .join(", ")}`
      );
    }
    if (storagePolicies[0]?.count !== 4) {
      failures.push("Expected four explicit avatar storage policies.");
    }

    if (failures.length) {
      throw new Error(failures.join("\n"));
    }

    console.log("RLS, SECURITY DEFINER functions, grants, and storage policies passed audit.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
