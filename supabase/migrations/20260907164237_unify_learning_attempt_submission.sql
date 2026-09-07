-- Unify web and mobile learning completion behind one server-side pipeline.
--
-- The secure award_xp wrapper already derives correctness and performs the atomic
-- progression writes. Move that core private, expose it as submit_learning_attempt,
-- and make award_xp a compatibility alias so older secure clients still use the
-- same pipeline.

alter function public.award_xp(text, text, jsonb) set schema private;
alter function private.award_xp(text, text, jsonb)
  rename to submit_learning_attempt_core;

revoke all on function private.submit_learning_attempt_core(text, text, jsonb)
  from public, anon, authenticated, service_role;

create function public.submit_learning_attempt(
  p_activity_type text,
  p_attempt_key text,
  p_answers jsonb,
  p_practice_list_id uuid default null
)
returns table (
  attempt_id uuid,
  xp_awarded integer,
  total_xp integer,
  was_duplicate boolean,
  unlocked_ids text[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_result record;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_practice_list_id is not null and not exists (
    select 1
    from public.practice_lists as list
    where list.id = p_practice_list_id
      and list.user_id = v_user_id
  ) then
    raise exception 'Practice list does not belong to the authenticated user'
      using errcode = '42501';
  end if;

  select core.*
  into v_result
  from private.submit_learning_attempt_core(
    p_activity_type,
    p_attempt_key,
    p_answers
  ) as core;

  -- practice_list_items.mastery_score is a display projection only. It is
  -- updated from the canonical mastery row after the same attempt succeeds,
  -- never from client-provided arithmetic.
  if not coalesce(v_result.was_duplicate, false)
    and p_practice_list_id is not null then
    update public.practice_list_items as item
    set
      mastery_score = mastery.mastery_score,
      last_reviewed = now(),
      updated_at = now()
    from public.practice_lists as list,
         public.mastery_records as mastery
    where item.list_id = p_practice_list_id
      and list.id = item.list_id
      and list.user_id = v_user_id
      and mastery.user_id = v_user_id
      and mastery.item_type = item.item_type
      and mastery.item_id = item.item_id::text
      and exists (
        select 1
        from jsonb_array_elements(p_answers) as submitted
        where submitted ->> 'item_type' = item.item_type
          and submitted ->> 'item_id' = item.item_id::text
      );
  end if;

  return query
    select
      v_result.attempt_id,
      v_result.xp_awarded,
      v_result.total_xp,
      v_result.was_duplicate,
      v_result.unlocked_ids;
end;
$$;

revoke all on function public.submit_learning_attempt(text, text, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.submit_learning_attempt(text, text, jsonb, uuid)
  to authenticated, service_role;

-- Compatibility alias. It accepts the already-secure three-argument contract,
-- but has no list context and cannot reach the old aggregate-score API.
create function public.award_xp(
  p_activity_type text,
  p_attempt_key text,
  p_answers jsonb
)
returns table (
  attempt_id uuid,
  xp_awarded integer,
  total_xp integer,
  was_duplicate boolean,
  unlocked_ids text[]
)
language sql
security invoker
set search_path = ''
as $$
  select *
  from public.submit_learning_attempt($1, $2, $3, null::uuid);
$$;

revoke all on function public.award_xp(text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.award_xp(text, text, jsonb)
  to authenticated, service_role;

-- No learning client may update streaks or mastery projections directly. The
-- pipeline's SECURITY DEFINER writes remain able to update these tables.
do $$
begin
  if to_regprocedure('public.increment_streak()') is not null then
    execute 'revoke all on function public.increment_streak() from public, anon, authenticated';
    execute 'grant execute on function public.increment_streak() to service_role';
  end if;
end;
$$;

revoke insert on public.practice_list_items from authenticated;
grant insert (list_id, item_id, item_type)
  on public.practice_list_items to authenticated;
revoke update on public.practice_list_items from authenticated;
grant select, delete on public.practice_list_items to authenticated;
