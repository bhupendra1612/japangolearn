-- ---------------------------------------------------------------------------
-- award_xp, now streak-freeze aware
-- ---------------------------------------------------------------------------

-- Recreated in full: PL/pgSQL bodies cannot be patched, and the streak block in
-- the middle is what changes. Everything else is identical to the previous
-- version.
create or replace function public.award_xp(
  p_activity_type text,
  p_correct_answers integer,
  p_total_questions integer,
  p_attempt_key text,
  p_answers jsonb default '[]'::jsonb
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
  v_attempt_id uuid;
  v_log_type text;
  v_title text;
  v_description text;
  v_quest_key text;
  v_xp_per_correct integer;
  v_max_questions integer;
  v_amount integer;
  v_current_xp integer;
  v_current_streak integer;
  v_last_active date;
  v_freezes integer;
  v_streak record;
  v_daily_awarded integer;
  v_activities_count integer;
  v_quest_completed boolean := false;
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
      v_quest_key := 'vocabulary';
      v_xp_per_correct := 5;
      v_max_questions := 15;
    when 'grammar_quiz' then
      v_log_type := 'grammar';
      v_title := 'Grammar Quiz Completed';
      v_description := 'Completed a grammar quiz';
      v_quest_key := 'grammar';
      v_xp_per_correct := 5;
      v_max_questions := 10;
    when 'writing_quiz' then
      v_log_type := 'kanji';
      v_title := 'Writing Quiz Completed';
      v_description := 'Completed a kana or kanji writing quiz';
      v_quest_key := 'kanji';
      v_xp_per_correct := 5;
      v_max_questions := 250;
    when 'practice_quiz' then
      v_log_type := 'lesson';
      v_title := 'Custom Practice Completed';
      v_description := 'Completed a custom practice quiz';
      v_xp_per_correct := 10;
      v_max_questions := 100;
    when 'review_session' then
      v_log_type := 'review';
      v_title := 'Review Session Completed';
      v_description := 'Reviewed items that were due';
      v_xp_per_correct := 3;
      v_max_questions := 100;
    else
      raise exception 'Unsupported learning activity type' using errcode = '22023';
  end case;

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

  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Answers must be a JSON array' using errcode = '22023';
  end if;

  if jsonb_array_length(p_answers) > p_total_questions then
    raise exception 'More answers than questions' using errcode = '22023';
  end if;

  select
    coalesce(profile.xp, 0),
    coalesce(profile.streak_days, 0),
    profile.last_active_at::date,
    coalesce(profile.streak_freezes, 0)
  into v_current_xp, v_current_streak, v_last_active, v_freezes
  from public.profiles as profile
  where profile.id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  select attempt.id
  into v_attempt_id
  from public.learning_attempts as attempt
  where attempt.user_id = v_user_id
    and attempt.attempt_key = p_attempt_key;

  if found then
    select coalesce(ledger.amount, 0)
    into v_amount
    from public.xp_ledger as ledger
    where ledger.user_id = v_user_id
      and ledger.award_key = 'quiz:' || p_attempt_key;

    return query
      select v_attempt_id, coalesce(v_amount, 0), v_current_xp, true, array[]::text[];
    return;
  end if;

  if exists (
    select 1
    from public.learning_attempts as attempt
    where attempt.user_id = v_user_id
      and attempt.activity_type = p_activity_type
      and attempt.completed_at > now() - interval '3 seconds'
  ) then
    raise exception 'Please wait before submitting another quiz' using errcode = 'P0001';
  end if;

  v_amount := p_correct_answers * v_xp_per_correct;

  select coalesce(sum(ledger.amount), 0)::integer
  into v_daily_awarded
  from public.xp_ledger as ledger
  where ledger.user_id = v_user_id
    and ledger.created_at >= current_date;

  if v_daily_awarded + v_amount > 1500 then
    raise exception 'Daily XP limit reached' using errcode = 'P0001';
  end if;

  insert into public.learning_attempts (
    user_id, activity_type, status, correct_answers, total_questions,
    attempt_key, started_at, completed_at
  )
  values (
    v_user_id, p_activity_type, 'completed', p_correct_answers, p_total_questions,
    p_attempt_key, now(), now()
  )
  returning id into v_attempt_id;

  insert into public.learning_attempt_answers (
    attempt_id, item_type, item_id, prompt, answer, correct_answer, is_correct, response_ms
  )
  select
    v_attempt_id,
    entry ->> 'item_type',
    entry ->> 'item_id',
    left(nullif(entry ->> 'prompt', ''), 400),
    left(nullif(entry ->> 'answer', ''), 400),
    left(nullif(entry ->> 'correct_answer', ''), 400),
    (entry ->> 'is_correct')::boolean,
    case
      when entry ->> 'response_ms' ~ '^[0-9]{1,8}$'
        then least((entry ->> 'response_ms')::integer, 3600000)
      else null
    end
  from jsonb_array_elements(p_answers) as entry
  where entry ->> 'item_type' in ('vocabulary', 'kana', 'kanji', 'grammar')
    and coalesce(entry ->> 'item_id', '') <> ''
    and length(entry ->> 'item_id') <= 64
    and entry ->> 'is_correct' in ('true', 'false');

  with graded as (
    select
      entry ->> 'item_type' as item_type,
      entry ->> 'item_id' as item_id,
      (entry ->> 'is_correct')::boolean as is_correct
    from jsonb_array_elements(p_answers) as entry
    where entry ->> 'item_type' in ('vocabulary', 'kana', 'kanji', 'grammar')
      and coalesce(entry ->> 'item_id', '') <> ''
      and length(entry ->> 'item_id') <= 64
      and entry ->> 'is_correct' in ('true', 'false')
  ),
  aggregated as (
    select
      item_type,
      item_id,
      count(*) filter (where is_correct)::integer as correct_count,
      count(*) filter (where not is_correct)::integer as incorrect_count
    from graded
    group by item_type, item_id
  )
  insert into public.mastery_records as mastery (
    user_id, item_type, item_id, mastery_score,
    correct_count, incorrect_count, last_reviewed_at, next_review_at
  )
  select
    v_user_id,
    aggregated.item_type,
    aggregated.item_id,
    private.apply_mastery(0, aggregated.correct_count, aggregated.incorrect_count),
    aggregated.correct_count,
    aggregated.incorrect_count,
    now(),
    now() + private.mastery_interval(
      private.apply_mastery(0, aggregated.correct_count, aggregated.incorrect_count),
      aggregated.incorrect_count > 0
    )
  from aggregated
  on conflict (user_id, item_type, item_id) do update
  set
    mastery_score = private.apply_mastery(
      mastery.mastery_score, excluded.correct_count, excluded.incorrect_count
    ),
    correct_count = mastery.correct_count + excluded.correct_count,
    incorrect_count = mastery.incorrect_count + excluded.incorrect_count,
    last_reviewed_at = now(),
    next_review_at = now() + private.mastery_interval(
      private.apply_mastery(
        mastery.mastery_score, excluded.correct_count, excluded.incorrect_count
      ),
      excluded.incorrect_count > 0
    );

  if v_amount > 0 then
    insert into public.xp_ledger (user_id, attempt_id, amount, reason, award_key)
    values (v_user_id, v_attempt_id, v_amount, p_activity_type, 'quiz:' || p_attempt_key);
  end if;

  insert into public.activity_events (user_id, attempt_id, event_name, source, properties)
  values (
    v_user_id,
    v_attempt_id,
    'learning.attempt_completed',
    'server',
    jsonb_build_object(
      'activity_type', p_activity_type,
      'correct_answers', p_correct_answers,
      'total_questions', p_total_questions,
      'answers_recorded', jsonb_array_length(p_answers),
      'xp_awarded', v_amount
    )
  );

  insert into public.activity_log (
    user_id, type, title, description, xp_earned, metadata, award_key
  )
  values (
    v_user_id,
    v_log_type,
    v_title,
    v_description,
    v_amount,
    jsonb_build_object(
      'attempt_id', v_attempt_id,
      'activity_type', p_activity_type,
      'correct_answers', p_correct_answers,
      'total_questions', p_total_questions
    ),
    'quiz:' || p_attempt_key
  );

  -- Streak, now able to spend a banked freeze to survive a missed day.
  select streak, freezes, freezes_spent
  into v_streak
  from private.resolve_streak(v_last_active, v_current_streak, v_freezes);

  v_current_streak := v_streak.streak;

  if v_streak.freezes_spent > 0 then
    insert into public.activity_events (user_id, attempt_id, event_name, source, properties)
    values (
      v_user_id,
      v_attempt_id,
      'learning.streak_freeze_spent',
      'server',
      jsonb_build_object(
        'freezes_spent', v_streak.freezes_spent,
        'freezes_remaining', v_streak.freezes,
        'streak', v_current_streak
      )
    );

    insert into public.activity_log (
      user_id, type, title, description, xp_earned, metadata, award_key
    )
    values (
      v_user_id,
      'streak',
      'Streak freeze used',
      'A banked freeze kept your streak alive.',
      0,
      jsonb_build_object('freezes_remaining', v_streak.freezes),
      -- The unique index is (user_id, award_key), so the date alone is enough
      -- to keep this to one entry per learner per day.
      'freeze:' || current_date::text
    )
    on conflict (user_id, award_key) do nothing;
  end if;

  v_current_xp := v_current_xp + v_amount;

  update public.profiles
  set
    xp = v_current_xp,
    streak_days = v_current_streak,
    streak_freezes = v_streak.freezes,
    last_active_at = now()
  where id = v_user_id;

  insert into public.user_streaks as streak (
    user_id, current_streak, longest_streak, last_practice_date
  )
  values (v_user_id, v_current_streak, v_current_streak, current_date)
  on conflict (user_id) do update
  set
    current_streak = excluded.current_streak,
    longest_streak = greatest(streak.longest_streak, excluded.current_streak),
    last_practice_date = excluded.last_practice_date,
    updated_at = now();

  if v_quest_key is not null then
    insert into public.daily_quest_completions (user_id, quest_key, quest_date, attempt_id)
    values (v_user_id, v_quest_key, current_date, v_attempt_id)
    on conflict (user_id, quest_date, quest_key) do nothing
    returning true into v_quest_completed;
  end if;

  if v_quest_completed then
    insert into public.activity_events (user_id, attempt_id, event_name, source, properties)
    values (
      v_user_id,
      v_attempt_id,
      'learning.daily_quest_completed',
      'server',
      jsonb_build_object('quest_key', v_quest_key, 'quest_date', current_date)
    );
  end if;

  insert into public.daily_goals as goal (
    user_id, date, xp_earned, tasks_completed, vocabulary_done, grammar_done, writing_done
  )
  values (
    v_user_id,
    current_date,
    v_amount,
    case when v_quest_completed then 1 else 0 end,
    case when v_quest_completed and v_quest_key = 'vocabulary' then 1 else 0 end,
    case when v_quest_completed and v_quest_key = 'grammar' then 1 else 0 end,
    case when v_quest_completed and v_quest_key = 'kanji' then 1 else 0 end
  )
  on conflict (user_id, date) do update
  set
    xp_earned = coalesce(goal.xp_earned, 0) + excluded.xp_earned,
    tasks_completed = least(
      coalesce(goal.tasks_total, 3),
      coalesce(goal.tasks_completed, 0) + excluded.tasks_completed
    ),
    vocabulary_done = greatest(coalesce(goal.vocabulary_done, 0), excluded.vocabulary_done),
    grammar_done = greatest(coalesce(goal.grammar_done, 0), excluded.grammar_done),
    writing_done = greatest(coalesce(goal.writing_done, 0), excluded.writing_done),
    updated_at = now();

  perform private.recompute_level_progress(v_user_id);

  select count(*)::integer
  into v_activities_count
  from public.learning_attempts as attempt
  where attempt.user_id = v_user_id
    and attempt.status = 'completed';

  for v_achievement in
    select achievement.id, achievement.condition
    from public.achievements as achievement
    where not exists (
      select 1
      from public.user_achievements as unlocked
      where unlocked.user_id = v_user_id
        and unlocked.achievement_id = achievement.id
    )
  loop
    v_condition_type := v_achievement.condition ->> 'type';

    if coalesce(v_achievement.condition ->> 'threshold', '') ~ '^[0-9]+$' then
      v_condition_threshold := (v_achievement.condition ->> 'threshold')::integer;
    else
      continue;
    end if;

    if (v_condition_type = 'xp' and v_current_xp >= v_condition_threshold)
      or (v_condition_type = 'streak' and v_current_streak >= v_condition_threshold)
      or (v_condition_type = 'activities' and v_activities_count >= v_condition_threshold) then
      insert into public.user_achievements (user_id, achievement_id)
      values (v_user_id, v_achievement.id)
      on conflict (user_id, achievement_id) do nothing;

      v_unlocked_ids := array_append(v_unlocked_ids, v_achievement.id::text);
    end if;
  end loop;

  return query
    select v_attempt_id, v_amount, v_current_xp, false, v_unlocked_ids;
end;
$$;

revoke all on function public.award_xp(text, integer, integer, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.award_xp(text, integer, integer, text, jsonb)
  to authenticated, service_role;
