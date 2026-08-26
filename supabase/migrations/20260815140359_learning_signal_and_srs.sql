-- Connect the learning tables that were built but never wired.
--
-- Three gaps are closed here:
--   1. `learning_attempt_answers` was created, indexed, and RLS'd but never
--      written, because award_xp only accepted an aggregate score. It now takes
--      the per-item results as well.
--   2. `mastery_records` (mastery_score / next_review_at, with an index on
--      (user_id, next_review_at) built for a due-review query) was permanently
--      empty. Those per-item results now drive it, giving the product a real
--      spaced-repetition schedule.
--   3. `user_level_progress` was inserted once at signup at 0% and never
--      updated, so the Learning Path read 0% forever. It is now recomputed from
--      mastery coverage on every completed attempt.
--
-- The 4-argument award_xp is replaced by a 5-argument version whose new
-- parameter defaults to an empty array. PostgREST resolves named-argument calls
-- against the default, so the existing mobile clients keep working untouched
-- and simply record no per-item detail until they are updated.

-- Reviews are first-class learning attempts so they flow through the same XP,
-- streak, daily-goal, and achievement path as quizzes.
--
-- The original constraint was declared inline and carries whatever name
-- Postgres generated. Rather than guess that name and silently leave the old
-- constraint in place — which would reject every review with a check violation
-- — find it by its definition and drop whatever is actually there.
do $$
declare
  v_constraint_name text;
begin
  for v_constraint_name in
    select constraint_name
    from information_schema.check_constraints
    where constraint_schema = 'public'
      and check_clause like '%vocabulary_quiz%'
      and constraint_name in (
        select constraint_name
        from information_schema.table_constraints
        where table_schema = 'public'
          and table_name = 'learning_attempts'
          and constraint_type = 'CHECK'
      )
  loop
    execute format(
      'alter table public.learning_attempts drop constraint %I',
      v_constraint_name
    );
  end loop;
end;
$$;

alter table public.learning_attempts
  add constraint learning_attempts_activity_type_check
  check (
    activity_type in (
      'vocabulary_quiz', 'grammar_quiz', 'writing_quiz', 'practice_quiz', 'review_session'
    )
  );

-- ---------------------------------------------------------------------------
-- Scheduling primitives
-- ---------------------------------------------------------------------------

-- A correct answer adds 20 points, an incorrect one removes 25. Missing an item
-- costs more than getting it right earns, so a shaky item cannot drift upward.
create or replace function private.apply_mastery(
  p_score numeric,
  p_correct integer,
  p_incorrect integer
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select greatest(
    0,
    least(100, coalesce(p_score, 0) + (coalesce(p_correct, 0) * 20) - (coalesce(p_incorrect, 0) * 25))
  );
$$;

-- Leitner-style ladder. A lapse always returns the item to the 10-minute box
-- regardless of its score: an item just answered wrong must not be parked three
-- weeks out simply because its historical score is still high.
create or replace function private.mastery_interval(
  p_score numeric,
  p_lapsed boolean
)
returns interval
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(p_lapsed, false) then interval '10 minutes'
    when coalesce(p_score, 0) < 20 then interval '10 minutes'
    when p_score < 40 then interval '1 day'
    when p_score < 60 then interval '3 days'
    when p_score < 80 then interval '7 days'
    when p_score < 95 then interval '21 days'
    else interval '60 days'
  end;
$$;

revoke all on function private.apply_mastery(numeric, integer, integer)
  from public, anon, authenticated;
revoke all on function private.mastery_interval(numeric, boolean)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Level progress, derived from mastery coverage
-- ---------------------------------------------------------------------------

-- Progress for a level is the share of that level's items the learner has taken
-- to a mastery score of 60 or better. Kana carries no jlpt_level column and is
-- foundational, so it counts toward N5.
create or replace function private.recompute_level_progress(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_level_progress as progress (user_id, jlpt_level, progress_percent)
  select
    p_user_id,
    totals.jlpt,
    least(100, round((coalesce(mastered.item_count, 0) / totals.item_count) * 100, 2))
  from (
    select jlpt, sum(item_count)::numeric as item_count
    from (
      select jlpt_level as jlpt, count(*)::numeric as item_count
        from public.vocabulary group by jlpt_level
      union all
      select jlpt_level, count(*)::numeric from public.kanji group by jlpt_level
      union all
      select jlpt_level, count(*)::numeric from public.grammar_patterns group by jlpt_level
      union all
      select 'N5', count(*)::numeric from public.kana
    ) as per_table
    where jlpt is not null
    group by jlpt
  ) as totals
  left join (
    select jlpt, count(*)::numeric as item_count
    from (
      select coalesce(
          vocabulary.jlpt_level,
          kanji.jlpt_level,
          grammar.jlpt_level,
          case when mastery.item_type = 'kana' then 'N5' end
        ) as jlpt
      from public.mastery_records as mastery
      left join public.vocabulary
        on mastery.item_type = 'vocabulary' and public.vocabulary.id::text = mastery.item_id
      left join public.kanji
        on mastery.item_type = 'kanji' and public.kanji.id::text = mastery.item_id
      left join public.grammar_patterns as grammar
        on mastery.item_type = 'grammar' and grammar.id::text = mastery.item_id
      where mastery.user_id = p_user_id
        and mastery.mastery_score >= 60
    ) as resolved
    where jlpt is not null
    group by jlpt
  ) as mastered on mastered.jlpt = totals.jlpt
  where totals.item_count > 0
  on conflict (user_id, jlpt_level) do update
  set
    progress_percent = excluded.progress_percent,
    -- Completion is sticky: reaching 100% stamps a date that later drift cannot
    -- clear, so a learner never loses a level they already finished.
    completed_at = case
      when excluded.progress_percent >= 100 then coalesce(progress.completed_at, now())
      else progress.completed_at
    end;
end;
$$;

revoke all on function private.recompute_level_progress(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- award_xp, now recording per-item signal
-- ---------------------------------------------------------------------------

drop function if exists public.award_xp(text, integer, integer, text);

create function public.award_xp(
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
      -- Reviews award less per item than fresh practice and complete no daily
      -- quest, so a large due queue cannot be farmed for XP.
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

  -- The client may send fewer answers than questions (an older build, or a
  -- partially recorded session), but never more than it claims to have asked.
  if jsonb_array_length(p_answers) > p_total_questions then
    raise exception 'More answers than questions' using errcode = '22023';
  end if;

  select
    coalesce(profile.xp, 0),
    coalesce(profile.streak_days, 0),
    profile.last_active_at::date
  into v_current_xp, v_current_streak, v_last_active
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
    user_id,
    activity_type,
    status,
    correct_answers,
    total_questions,
    attempt_key,
    started_at,
    completed_at
  )
  values (
    v_user_id,
    p_activity_type,
    'completed',
    p_correct_answers,
    p_total_questions,
    p_attempt_key,
    now(),
    now()
  )
  returning id into v_attempt_id;

  -- Per-item detail. Malformed entries are skipped rather than failing the
  -- whole submission: a learner must not lose a finished quiz to one bad row.
  insert into public.learning_attempt_answers (
    attempt_id,
    item_type,
    item_id,
    prompt,
    answer,
    correct_answer,
    is_correct,
    response_ms
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

  -- Mastery and the review schedule. Answers are aggregated per item first so
  -- an item asked twice in one session produces one upsert, not a conflict.
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
    user_id,
    item_type,
    item_id,
    mastery_score,
    correct_count,
    incorrect_count,
    last_reviewed_at,
    next_review_at
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
      mastery.mastery_score,
      excluded.correct_count,
      excluded.incorrect_count
    ),
    correct_count = mastery.correct_count + excluded.correct_count,
    incorrect_count = mastery.incorrect_count + excluded.incorrect_count,
    last_reviewed_at = now(),
    next_review_at = now() + private.mastery_interval(
      private.apply_mastery(
        mastery.mastery_score,
        excluded.correct_count,
        excluded.incorrect_count
      ),
      excluded.incorrect_count > 0
    );

  if v_amount > 0 then
    insert into public.xp_ledger (
      user_id,
      attempt_id,
      amount,
      reason,
      award_key
    )
    values (
      v_user_id,
      v_attempt_id,
      v_amount,
      p_activity_type,
      'quiz:' || p_attempt_key
    );
  end if;

  insert into public.activity_events (
    user_id,
    attempt_id,
    event_name,
    source,
    properties
  )
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
      'attempt_id', v_attempt_id,
      'activity_type', p_activity_type,
      'correct_answers', p_correct_answers,
      'total_questions', p_total_questions
    ),
    'quiz:' || p_attempt_key
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

  insert into public.user_streaks as streak (
    user_id,
    current_streak,
    longest_streak,
    last_practice_date
  )
  values (
    v_user_id,
    v_current_streak,
    v_current_streak,
    current_date
  )
  on conflict (user_id) do update
  set
    current_streak = excluded.current_streak,
    longest_streak = greatest(streak.longest_streak, excluded.current_streak),
    last_practice_date = excluded.last_practice_date,
    updated_at = now();

  if v_quest_key is not null then
    insert into public.daily_quest_completions (
      user_id,
      quest_key,
      quest_date,
      attempt_id
    )
    values (
      v_user_id,
      v_quest_key,
      current_date,
      v_attempt_id
    )
    on conflict (user_id, quest_date, quest_key) do nothing
    returning true into v_quest_completed;
  end if;

  if v_quest_completed then
    insert into public.activity_events (
      user_id,
      attempt_id,
      event_name,
      source,
      properties
    )
    values (
      v_user_id,
      v_attempt_id,
      'learning.daily_quest_completed',
      'server',
      jsonb_build_object(
        'quest_key', v_quest_key,
        'quest_date', current_date
      )
    );
  end if;

  insert into public.daily_goals as goal (
    user_id,
    date,
    xp_earned,
    tasks_completed,
    vocabulary_done,
    grammar_done,
    writing_done
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

  -- Level progress follows from the mastery rows written above.
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

-- ---------------------------------------------------------------------------
-- Review queue
-- ---------------------------------------------------------------------------

-- Due items joined to their content, so the review session can render a real
-- prompt instead of an opaque item id. Security invoker: the mastery_records
-- owner policy is what scopes this to the caller.
create or replace function public.get_due_reviews(p_limit integer default 20)
returns table (
  item_type text,
  item_id text,
  mastery_score numeric,
  next_review_at timestamptz,
  prompt text,
  reading text,
  answer text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    mastery.item_type,
    mastery.item_id,
    mastery.mastery_score,
    mastery.next_review_at,
    case
      when mastery.item_type = 'vocabulary'
        then coalesce(nullif(vocabulary.kanji, ''), vocabulary.hiragana)
      when mastery.item_type = 'kanji' then kanji.character
      when mastery.item_type = 'kana' then kana.character
      when mastery.item_type = 'grammar' then grammar.title
    end as prompt,
    case
      when mastery.item_type = 'vocabulary' then vocabulary.hiragana
      when mastery.item_type = 'kanji' then kanji.hiragana
      when mastery.item_type = 'grammar' then grammar.pattern
      else null
    end as reading,
    case
      when mastery.item_type = 'vocabulary' then vocabulary.english
      when mastery.item_type = 'kanji' then array_to_string(kanji.meaning_en, ', ')
      when mastery.item_type = 'kana' then kana.romaji
      when mastery.item_type = 'grammar' then grammar.meaning
    end as answer
  from public.mastery_records as mastery
  left join public.vocabulary
    on mastery.item_type = 'vocabulary' and public.vocabulary.id::text = mastery.item_id
  left join public.kanji
    on mastery.item_type = 'kanji' and public.kanji.id::text = mastery.item_id
  left join public.kana
    on mastery.item_type = 'kana' and public.kana.id::text = mastery.item_id
  left join public.grammar_patterns as grammar
    on mastery.item_type = 'grammar' and grammar.id::text = mastery.item_id
  where mastery.user_id = (select auth.uid())
    and mastery.next_review_at is not null
    and mastery.next_review_at <= now()
  order by mastery.next_review_at
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

revoke all on function public.get_due_reviews(integer) from public, anon;
grant execute on function public.get_due_reviews(integer) to authenticated, service_role;

-- Counts for the dashboard card. Kept as one round trip rather than several
-- filtered selects from the client.
create or replace function public.get_review_summary()
returns table (
  due_now integer,
  due_today integer,
  tracked_items integer,
  weak_items integer,
  mastered_items integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*) filter (
      where mastery.next_review_at is not null and mastery.next_review_at <= now()
    )::integer,
    count(*) filter (
      where mastery.next_review_at is not null
        and mastery.next_review_at < date_trunc('day', now()) + interval '1 day'
    )::integer,
    count(*)::integer,
    count(*) filter (where mastery.mastery_score < 40)::integer,
    count(*) filter (where mastery.mastery_score >= 80)::integer
  from public.mastery_records as mastery
  where mastery.user_id = (select auth.uid());
$$;

revoke all on function public.get_review_summary() from public, anon;
grant execute on function public.get_review_summary() to authenticated, service_role;

-- Bring existing accounts onto the derived progress figure. Everyone starts at
-- 0% because no mastery rows exist yet; the value becomes real as they study.
do $$
declare
  v_user record;
begin
  for v_user in select id from public.profiles loop
    perform private.recompute_level_progress(v_user.id);
  end loop;
end;
$$;
