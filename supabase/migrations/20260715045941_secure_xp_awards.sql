-- XP is a server-owned value. API clients may request an award, but the
-- database chooses the amount, enforces limits, and makes retries idempotent.

alter table public.activity_log
  add column if not exists award_key text;

create unique index if not exists activity_log_user_award_key_key
  on public.activity_log (user_id, award_key);

-- Prevent clients from bypassing the RPC by writing protected gamification
-- fields and ledgers directly. Profile editing remains available only for the
-- explicitly listed user-owned columns.
revoke insert, delete, truncate, references, trigger
  on table public.profiles
  from anon, authenticated;
revoke update on table public.profiles from anon, authenticated;
grant update (display_name, avatar_url, current_jlpt_level, onboarding_completed)
  on table public.profiles
  to authenticated;

revoke insert, update, delete, truncate, references, trigger
  on table public.activity_log, public.daily_goals, public.user_achievements
  from anon, authenticated;
grant select
  on table public.activity_log, public.daily_goals, public.user_achievements
  to authenticated;

drop function if exists public.award_xp(text, text, text, integer);

create function public.award_xp(
  p_activity_type text,
  p_correct_answers integer,
  p_total_questions integer,
  p_attempt_key text
)
returns table (
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
  v_log_type text;
  v_title text;
  v_description text;
  v_xp_per_correct integer;
  v_max_questions integer;
  v_amount integer;
  v_award_key text;
  v_is_daily boolean := false;
  v_current_xp integer;
  v_current_streak integer;
  v_last_active date;
  v_daily_awarded integer;
  v_existing_amount integer;
  v_activities_count integer;
  v_achievement record;
  v_condition_type text;
  v_condition_threshold integer;
  v_unlocked_ids text[] := array[]::text[];
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  case p_activity_type
    when 'vocabulary_quiz' then
      v_log_type := 'vocabulary';
      v_title := 'Vocabulary Quiz Completed';
      v_description := 'Completed a vocabulary quiz';
      v_xp_per_correct := 5;
      v_max_questions := 15;
    when 'grammar_quiz' then
      v_log_type := 'grammar';
      v_title := 'Grammar Quiz Completed';
      v_description := 'Completed a grammar quiz';
      v_xp_per_correct := 5;
      v_max_questions := 10;
    when 'writing_quiz' then
      v_log_type := 'kanji';
      v_title := 'Kana Writing Quiz Completed';
      v_description := 'Completed a kana writing quiz';
      v_xp_per_correct := 5;
      v_max_questions := 250;
    when 'practice_quiz' then
      v_log_type := 'lesson';
      v_title := 'Custom List Practice Completed';
      v_description := 'Completed a custom list practice quiz';
      v_xp_per_correct := 10;
      v_max_questions := 100;
    when 'daily_vocabulary' then
      v_log_type := 'vocabulary';
      v_title := 'Completed Vocabulary Practice';
      v_description := 'Completed the daily vocabulary task';
      v_amount := 25;
      v_is_daily := true;
    when 'daily_kanji' then
      v_log_type := 'kanji';
      v_title := 'Completed Kanji Stroke Practice';
      v_description := 'Completed the daily kanji task';
      v_amount := 35;
      v_is_daily := true;
    when 'daily_grammar' then
      v_log_type := 'grammar';
      v_title := 'Completed Grammar Lesson';
      v_description := 'Completed the daily grammar task';
      v_amount := 40;
      v_is_daily := true;
    when 'daily_listening' then
      v_log_type := 'listening';
      v_title := 'Completed Listening Exercise';
      v_description := 'Completed the daily listening task';
      v_amount := 30;
      v_is_daily := true;
    else
      raise exception 'Unsupported XP activity type' using errcode = '22023';
  end case;

  if v_is_daily then
    v_award_key := 'daily:' || p_activity_type || ':' || current_date::text;
  else
    if p_correct_answers < 0
      or p_total_questions < 1
      or p_correct_answers > p_total_questions
      or p_total_questions > v_max_questions then
      raise exception 'Invalid quiz score' using errcode = '22023';
    end if;

    if p_attempt_key is null
      or p_attempt_key !~ '^[A-Za-z0-9._:-]{12,128}$' then
      raise exception 'Invalid attempt key' using errcode = '22023';
    end if;

    v_amount := p_correct_answers * v_xp_per_correct;
    if v_amount < 1 then
      raise exception 'No XP earned' using errcode = '22023';
    end if;
    v_award_key := 'quiz:' || p_attempt_key;
  end if;

  select
    coalesce(p.xp, 0),
    coalesce(p.streak_days, 0),
    p.last_active_at::date
  into v_current_xp, v_current_streak, v_last_active
  from public.profiles as p
  where p.id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  select a.xp_earned
  into v_existing_amount
  from public.activity_log as a
  where a.user_id = v_user_id
    and a.award_key = v_award_key;

  if found then
    return query
      select coalesce(v_existing_amount, 0), v_current_xp, true, array[]::text[];
    return;
  end if;

  if not v_is_daily and exists (
    select 1
    from public.activity_log as a
    where a.user_id = v_user_id
      and a.metadata->>'activity_type' = p_activity_type
      and a.award_key is not null
      and a.created_at > now() - interval '10 seconds'
  ) then
    raise exception 'Please wait before submitting another quiz' using errcode = 'P0001';
  end if;

  select coalesce(sum(a.xp_earned), 0)::integer
  into v_daily_awarded
  from public.activity_log as a
  where a.user_id = v_user_id
    and a.award_key is not null
    and a.created_at >= current_date;

  if v_daily_awarded + v_amount > 1500 then
    raise exception 'Daily XP limit reached' using errcode = 'P0001';
  end if;

  insert into public.activity_log (
    user_id,
    type,
    title,
    description,
    xp_earned,
    metadata,
    award_key
  )
  values (
    v_user_id,
    v_log_type,
    v_title,
    v_description,
    v_amount,
    jsonb_build_object(
      'activity_type', p_activity_type,
      'correct_answers', p_correct_answers,
      'total_questions', p_total_questions
    ),
    v_award_key
  );

  if v_last_active is distinct from current_date then
    if v_last_active = current_date - 1 then
      v_current_streak := v_current_streak + 1;
    else
      v_current_streak := 1;
    end if;
  end if;

  v_current_xp := v_current_xp + v_amount;

  update public.profiles
  set
    xp = v_current_xp,
    streak_days = v_current_streak,
    last_active_at = now()
  where id = v_user_id;

  insert into public.daily_goals as goal (
    user_id,
    date,
    xp_earned,
    tasks_completed
  )
  values (
    v_user_id,
    current_date,
    v_amount,
    case when v_is_daily then 1 else 0 end
  )
  on conflict (user_id, date) do update
  set
    xp_earned = coalesce(goal.xp_earned, 0) + excluded.xp_earned,
    tasks_completed = least(
      coalesce(goal.tasks_total, 4),
      coalesce(goal.tasks_completed, 0) + excluded.tasks_completed
    );

  select count(*)::integer
  into v_activities_count
  from public.activity_log as a
  where a.user_id = v_user_id;

  for v_achievement in
    select a.id, a.condition
    from public.achievements as a
    where not exists (
      select 1
      from public.user_achievements as ua
      where ua.user_id = v_user_id
        and ua.achievement_id = a.id
    )
  loop
    v_condition_type := v_achievement.condition->>'type';

    if coalesce(v_achievement.condition->>'threshold', '') ~ '^[0-9]+$' then
      v_condition_threshold := (v_achievement.condition->>'threshold')::integer;
    else
      continue;
    end if;

    if (v_condition_type = 'xp' and v_current_xp >= v_condition_threshold)
      or (v_condition_type = 'streak' and v_current_streak >= v_condition_threshold)
      or (v_condition_type = 'activities' and v_activities_count >= v_condition_threshold) then
      insert into public.user_achievements (user_id, achievement_id)
      values (v_user_id, v_achievement.id)
      on conflict (user_id, achievement_id) do nothing;

      v_unlocked_ids := array_append(v_unlocked_ids, v_achievement.id);
    end if;
  end loop;

  return query
    select v_amount, v_current_xp, false, v_unlocked_ids;
end;
$$;

revoke all on function public.award_xp(text, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.award_xp(text, integer, integer, text)
  to authenticated, service_role;
