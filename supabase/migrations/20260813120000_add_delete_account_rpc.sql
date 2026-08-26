-- Self-service account deletion, required for Google Play's account
-- deletion policy. Runs as the migration owner so it can remove the
-- auth.users row directly; RLS on public tables is irrelevant here since
-- everything cascades from auth.users -> profiles -> the rest.
--
-- Some records must be retained for legal/financial reasons (paid course
-- orders) or reference integrity (published courses, blog posts), which are
-- linked with `on delete restrict` / `no action`. When those exist, we fall
-- back to anonymizing the profile and locking the auth user out instead of
-- failing the deletion request outright.

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  begin
    delete from auth.users where id = v_user_id;
    return;
  exception when foreign_key_violation then
    -- Retained records (purchases, published courses, blog posts) block a
    -- hard delete. Anonymize and lock the account instead.
    null;
  end;

  update public.profiles
  set display_name = 'Deleted user',
      avatar_url = null,
      onboarding_completed = false
  where id = v_user_id;

  update auth.users
  set email = null,
      phone = null,
      encrypted_password = '',
      raw_user_meta_data = '{}'::jsonb,
      raw_app_meta_data = '{}'::jsonb,
      banned_until = 'infinity'::timestamptz,
      deleted_at = now()
  where id = v_user_id;

  delete from auth.identities where user_id = v_user_id;
  delete from auth.sessions where user_id = v_user_id;
end;
$$;

revoke all on function public.delete_account() from public, anon, authenticated;
grant execute on function public.delete_account() to authenticated;
