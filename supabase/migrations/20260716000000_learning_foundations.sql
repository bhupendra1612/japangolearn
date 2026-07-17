-- First-class learning records and separated gamification state.

create table if not exists public.learning_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_type text not null
    check (activity_type in ('vocabulary_quiz', 'grammar_quiz', 'writing_quiz', 'practice_quiz')),
  status text not null default 'completed'
    check (status in ('started', 'completed', 'abandoned')),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  total_questions integer not null default 0 check (total_questions >= 0),
  score_percent numeric(5, 2) generated always as (
    case
      when total_questions = 0 then 0
      else round((correct_answers::numeric / total_questions::numeric) * 100, 2)
    end
  ) stored,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  attempt_key text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, attempt_key),
  check (correct_answers <= total_questions),
  check (
    (status = 'completed' and completed_at is not null)
    or status <> 'completed'
  )
);

create table if not exists public.learning_attempt_answers (
  id uuid primary key default extensions.gen_random_uuid(),
  attempt_id uuid not null references public.learning_attempts(id) on delete cascade,
  item_type text not null check (item_type in ('vocabulary', 'kana', 'kanji', 'grammar')),
  item_id text not null,
  prompt text,
  answer text,
  correct_answer text,
  is_correct boolean not null,
  response_ms integer check (response_ms is null or response_ms >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  attempt_id uuid references public.learning_attempts(id) on delete set null,
  event_name text not null,
  source text not null default 'server'
    check (source in ('web', 'mobile', 'admin', 'server', 'migration')),
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.xp_ledger (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  attempt_id uuid references public.learning_attempts(id) on delete set null,
  amount integer not null check (amount > 0),
  reason text not null,
  award_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, award_key)
);

create table if not exists public.mastery_records (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null check (item_type in ('vocabulary', 'kana', 'kanji', 'grammar')),
  item_id text not null,
  mastery_score numeric(5, 2) not null default 0 check (mastery_score between 0 and 100),
  correct_count integer not null default 0 check (correct_count >= 0),
  incorrect_count integer not null default 0 check (incorrect_count >= 0),
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create table if not exists public.daily_quest_completions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quest_key text not null check (quest_key in ('vocabulary', 'grammar', 'kanji')),
  quest_date date not null default current_date,
  attempt_id uuid not null references public.learning_attempts(id) on delete restrict,
  completed_at timestamptz not null default now(),
  unique (user_id, quest_date, quest_key)
);

create index if not exists learning_attempts_user_completed_at_idx
  on public.learning_attempts (user_id, completed_at desc)
  where status = 'completed';
create index if not exists learning_attempt_answers_attempt_id_idx
  on public.learning_attempt_answers (attempt_id);
create index if not exists activity_events_user_occurred_at_idx
  on public.activity_events (user_id, occurred_at desc);
create index if not exists activity_events_attempt_id_idx
  on public.activity_events (attempt_id);
create index if not exists xp_ledger_user_created_at_idx
  on public.xp_ledger (user_id, created_at desc);
create index if not exists xp_ledger_attempt_id_idx
  on public.xp_ledger (attempt_id);
create index if not exists mastery_records_user_next_review_idx
  on public.mastery_records (user_id, next_review_at)
  where next_review_at is not null;
create index if not exists daily_quest_completions_user_date_idx
  on public.daily_quest_completions (user_id, quest_date desc);
create index if not exists daily_quest_completions_attempt_id_idx
  on public.daily_quest_completions (attempt_id);

drop trigger if exists set_mastery_records_updated_at on public.mastery_records;
create trigger set_mastery_records_updated_at
  before update on public.mastery_records
  for each row execute function private.set_updated_at();

-- Preserve historical activity as separate event and ledger data. Historical
-- quiz logs with usable metadata are also promoted to first-class attempts.
with legacy_quiz_logs as (
  select
    log.*,
    case
      when coalesce(log.metadata ->> 'correct_answers', '') ~ '^[0-9]+$'
        then (log.metadata ->> 'correct_answers')::integer
      else 0
    end as parsed_correct_answers,
    case
      when coalesce(log.metadata ->> 'total_questions', '') ~ '^[0-9]+$'
        then (log.metadata ->> 'total_questions')::integer
      else 0
    end as parsed_total_questions
  from public.activity_log as log
  where log.award_key like 'quiz:%'
    and log.metadata ->> 'activity_type' in (
      'vocabulary_quiz',
      'grammar_quiz',
      'writing_quiz',
      'practice_quiz'
    )
)
insert into public.learning_attempts (
  user_id,
  activity_type,
  status,
  correct_answers,
  total_questions,
  attempt_key,
  started_at,
  completed_at,
  metadata,
  created_at
)
select
  log.user_id,
  log.metadata ->> 'activity_type',
  'completed',
  greatest(log.parsed_correct_answers, 0),
  greatest(log.parsed_total_questions, 0),
  substring(log.award_key from 6),
  log.created_at,
  log.created_at,
  jsonb_build_object('migrated_from_activity_log', log.id),
  log.created_at
from legacy_quiz_logs as log
where log.parsed_total_questions > 0
  and log.parsed_correct_answers <= log.parsed_total_questions
on conflict (user_id, attempt_key) do nothing;

insert into public.xp_ledger (
  user_id,
  attempt_id,
  amount,
  reason,
  award_key,
  created_at
)
select
  log.user_id,
  attempt.id,
  log.xp_earned,
  coalesce(log.metadata ->> 'activity_type', log.type),
  log.award_key,
  log.created_at
from public.activity_log as log
left join public.learning_attempts as attempt
  on attempt.user_id = log.user_id
  and log.award_key = 'quiz:' || attempt.attempt_key
where log.award_key is not null
  and log.xp_earned > 0
on conflict (user_id, award_key) do nothing;

insert into public.activity_events (
  user_id,
  attempt_id,
  event_name,
  source,
  properties,
  occurred_at
)
select
  log.user_id,
  attempt.id,
  'learning.activity_migrated',
  'migration',
  jsonb_build_object(
    'legacy_activity_id', log.id,
    'legacy_type', log.type,
    'xp_earned', log.xp_earned
  ),
  log.created_at
from public.activity_log as log
left join public.learning_attempts as attempt
  on attempt.user_id = log.user_id
  and log.award_key = 'quiz:' || attempt.attempt_key
where not exists (
  select 1
  from public.activity_events as event
  where event.properties ->> 'legacy_activity_id' = log.id::text
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'learning_attempts', 'learning_attempt_answers', 'activity_events',
    'xp_ledger', 'mastery_records', 'daily_quest_completions'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

drop policy if exists "learning_attempts_select_owner" on public.learning_attempts;
create policy "learning_attempts_select_owner" on public.learning_attempts
  for select to authenticated
  using ((select auth.uid()) = user_id or (select private.is_admin()));

drop policy if exists "learning_attempt_answers_select_owner" on public.learning_attempt_answers;
create policy "learning_attempt_answers_select_owner" on public.learning_attempt_answers
  for select to authenticated
  using (
    exists (
      select 1
      from public.learning_attempts
      where learning_attempts.id = learning_attempt_answers.attempt_id
        and (
          learning_attempts.user_id = (select auth.uid())
          or (select private.is_admin())
        )
    )
  );

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'activity_events', 'xp_ledger', 'mastery_records', 'daily_quest_completions'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_select_owner', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id or (select private.is_admin()))',
      table_name || '_select_owner',
      table_name
    );
  end loop;
end;
$$;

revoke all on public.learning_attempts, public.learning_attempt_answers,
  public.activity_events, public.xp_ledger, public.mastery_records,
  public.daily_quest_completions
  from anon, authenticated;
grant select on public.learning_attempts, public.learning_attempt_answers,
  public.activity_events, public.xp_ledger, public.mastery_records,
  public.daily_quest_completions
  to authenticated;

-- The database owns learning completion and all derived gamification writes.
drop function if exists public.award_xp(text, text, text, integer);
drop function if exists public.award_xp(text, integer, integer, text);
drop type if exists public.achievement_unlock_result;

create function public.award_xp(
  p_activity_type text,
  p_correct_answers integer,
  p_total_questions integer,
  p_attempt_key text
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

revoke all on function public.award_xp(text, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.award_xp(text, integer, integer, text)
  to authenticated, service_role;

-- The legacy streak function is retained for mobile compatibility but hardened.
create or replace function public.increment_streak()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := current_date;
  v_current integer;
  v_longest integer;
  v_last date;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select current_streak, longest_streak, last_practice_date
  into v_current, v_longest, v_last
  from public.user_streaks
  where user_id = v_user_id
  for update;

  if not found then
    insert into public.user_streaks (
      user_id, current_streak, longest_streak, last_practice_date
    )
    values (v_user_id, 1, 1, v_today);
    return;
  end if;

  if v_last = v_today then
    return;
  elsif v_last = v_today - 1 then
    v_current := v_current + 1;
  else
    v_current := 1;
  end if;

  update public.user_streaks
  set
    current_streak = v_current,
    longest_streak = greatest(v_longest, v_current),
    last_practice_date = v_today,
    updated_at = now()
  where user_id = v_user_id;
end;
$$;

revoke all on function public.increment_streak() from public, anon, authenticated;
grant execute on function public.increment_streak() to authenticated, service_role;

create or replace function public.track_analytics_event(
  p_event_name text,
  p_properties jsonb default '{}'::jsonb,
  p_source text default 'web'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_event_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_event_name not in (
    'auth.signup_started',
    'auth.signup_completed',
    'auth.login_completed',
    'learning.quiz_started',
    'learning.attempt_completed',
    'learning.daily_quest_completed',
    'navigation.feature_blocked',
    'admin.authorization_denied'
  ) then
    raise exception 'Unknown analytics event' using errcode = '22023';
  end if;

  if p_source not in ('web', 'mobile', 'admin') then
    raise exception 'Invalid analytics source' using errcode = '22023';
  end if;

  if pg_column_size(coalesce(p_properties, '{}'::jsonb)) > 8192 then
    raise exception 'Analytics properties are too large' using errcode = '22023';
  end if;

  insert into public.activity_events (user_id, event_name, source, properties)
  values (v_user_id, p_event_name, p_source, coalesce(p_properties, '{}'::jsonb))
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function public.track_analytics_event(text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.track_analytics_event(text, jsonb, text)
  to authenticated, service_role;
