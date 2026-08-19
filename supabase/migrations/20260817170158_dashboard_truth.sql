-- Replace the dashboard's fabricated surfaces with derived facts.
--
--   1. The skill radar counted attempts, not proficiency, and carried hardcoded
--      "Listening" and "Lessons" axes that no web activity can ever fill — so
--      every learner was permanently told to "Focus On: Listening". It now reads
--      real per-item-type mastery from mastery_records.
--   2. The notification bell rendered three hardcoded strings with a permanent
--      unread dot. Notifications are now derived from the learner's own data.
--   3. Kanji of the Day rotated a hardcoded array of seven by weekday, ignoring
--      the kanji table and the learner's level.
--   4. The daily XP goal was fixed at 100 and settable nowhere.
--
-- It also closes a privilege-escalation hole found while doing the above: the
-- profiles update policy has no column restriction and no trigger guarded it,
-- so any signed-in user could set their own row's `role` to 'admin' — which
-- private.has_role('admin') honours, granting the admin console and every
-- is_admin() branch in RLS.

-- ---------------------------------------------------------------------------
-- Security: pin role and identity against self-service escalation
-- ---------------------------------------------------------------------------

create or replace function private.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only police direct writes from the authenticated role, i.e. a PostgREST
  -- request against /rest/v1/profiles. award_xp, increment_streak, and the
  -- other security-definer paths execute as the function owner, so they pass
  -- straight through — without this check the guard would break XP awarding.
  if current_user <> 'authenticated' then
    return new;
  end if;

  -- Admins may still change roles deliberately through the admin app.
  if private.is_admin() then
    return new;
  end if;

  -- Silently pinning is wrong here: a caller trying to change these deserves an
  -- error rather than a write that appears to succeed.
  if new.role is distinct from old.role then
    raise exception 'Role cannot be changed by the account holder'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id then
    raise exception 'Profile identity cannot be changed' using errcode = '42501';
  end if;

  -- XP and streak are owned by award_xp, which is security definer and runs
  -- with the table owner's rights, so it is unaffected by this guard.
  if new.xp is distinct from old.xp or new.streak_days is distinct from old.streak_days then
    raise exception 'Progress fields are awarded by the server' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_profile_privileges() from public, anon, authenticated;

drop trigger if exists guard_profile_privileges on public.profiles;
create trigger guard_profile_privileges
  before update on public.profiles
  for each row execute function private.guard_profile_privileges();

-- ---------------------------------------------------------------------------
-- Learner-controlled daily goal
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists daily_xp_goal integer not null default 100
    check (daily_xp_goal between 10 and 1000);

alter table public.profiles
  add column if not exists notifications_seen_at timestamptz;

-- daily_goals rows are created by award_xp, which does not name xp_target, so
-- the column default applied and every learner was pinned to 100. This carries
-- the learner's chosen goal onto the row instead.
create or replace function private.apply_daily_goal_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select coalesce(profile.daily_xp_goal, 100)
  into new.xp_target
  from public.profiles as profile
  where profile.id = new.user_id;

  new.xp_target := coalesce(new.xp_target, 100);
  return new;
end;
$$;

revoke all on function private.apply_daily_goal_target() from public, anon, authenticated;

drop trigger if exists set_daily_goal_target on public.daily_goals;
create trigger set_daily_goal_target
  before insert on public.daily_goals
  for each row execute function private.apply_daily_goal_target();

-- Learners have no UPDATE grant on daily_goals, so changing the goal mid-day
-- goes through here rather than widening that table's policy.
create or replace function public.set_daily_xp_goal(p_goal integer)
returns integer
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

  if p_goal is null or p_goal < 10 or p_goal > 1000 then
    raise exception 'Daily goal must be between 10 and 1000 XP' using errcode = '22023';
  end if;

  update public.profiles set daily_xp_goal = p_goal where id = v_user_id;

  -- Today's row already exists once any XP has been earned; move its target so
  -- the change takes effect immediately rather than tomorrow.
  update public.daily_goals
  set xp_target = p_goal, updated_at = now()
  where user_id = v_user_id and date = current_date;

  return p_goal;
end;
$$;

revoke all on function public.set_daily_xp_goal(integer) from public, anon;
grant execute on function public.set_daily_xp_goal(integer) to authenticated, service_role;

create or replace function public.mark_notifications_seen()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.profiles set notifications_seen_at = v_now where id = v_user_id;
  return v_now;
end;
$$;

revoke all on function public.mark_notifications_seen() from public, anon;
grant execute on function public.mark_notifications_seen() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Skill breakdown from real mastery
-- ---------------------------------------------------------------------------

-- One row per content family the learner has actually touched. accuracy comes
-- from the lifetime correct/incorrect tallies already kept on mastery_records,
-- so it reflects answers rather than attempt counts.
create or replace function public.get_skill_breakdown()
returns table (
  item_type text,
  tracked integer,
  mastered integer,
  avg_mastery numeric,
  accuracy numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    mastery.item_type,
    count(*)::integer,
    count(*) filter (where mastery.mastery_score >= 80)::integer,
    round(avg(mastery.mastery_score), 1),
    case
      when sum(mastery.correct_count + mastery.incorrect_count) > 0
        then round(
          (100.0 * sum(mastery.correct_count))
            / sum(mastery.correct_count + mastery.incorrect_count),
          1
        )
      else 0
    end
  from public.mastery_records as mastery
  where mastery.user_id = (select auth.uid())
  group by mastery.item_type;
$$;

revoke all on function public.get_skill_breakdown() from public, anon;
grant execute on function public.get_skill_breakdown() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Kanji of the day, from the kanji table
-- ---------------------------------------------------------------------------

-- Deterministic per calendar day so the card does not reshuffle on refresh, and
-- drawn from the learner's own level. Output columns avoid the name "character",
-- which is a reserved type keyword and cannot be an OUT parameter.
create or replace function public.get_kanji_of_the_day(p_level text default 'N5')
returns table (
  kanji_id integer,
  glyph text,
  meanings text[],
  reading_on jsonb,
  reading_kun jsonb,
  romaji text,
  jlpt_level text,
  stroke_count integer
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_level text := coalesce(nullif(p_level, ''), 'N5');
  v_total integer;
begin
  select count(*) into v_total from public.kanji where public.kanji.jlpt_level = v_level;

  -- A level with no kanji yet falls back to the whole table rather than
  -- returning nothing and leaving a hole in the dashboard.
  if v_total = 0 then
    v_level := null;
    select count(*) into v_total from public.kanji;
  end if;

  if v_total = 0 then
    return;
  end if;

  return query
  with pool as (
    select
      k.id,
      k."character" as glyph,
      k.meaning_en,
      k.onyomi,
      k.kunyomi,
      k.romaji,
      k.jlpt_level,
      k.stroke_count,
      row_number() over (order by k.order_index, k.id) as position
    from public.kanji as k
    where v_level is null or k.jlpt_level = v_level
  )
  select
    pool.id,
    pool.glyph,
    pool.meaning_en,
    pool.onyomi,
    pool.kunyomi,
    pool.romaji,
    pool.jlpt_level,
    pool.stroke_count
  from pool
  where pool.position = 1 + (
    (extract(doy from current_date)::integer + extract(year from current_date)::integer) % v_total
  );
end;
$$;

revoke all on function public.get_kanji_of_the_day(text) from public, anon;
grant execute on function public.get_kanji_of_the_day(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Notifications, derived rather than invented
-- ---------------------------------------------------------------------------

create or replace function public.get_notifications(p_limit integer default 8)
returns table (
  kind text,
  title text,
  body text,
  href text,
  occurred_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with due as (
    select count(*)::integer as items, max(mastery.next_review_at) as latest
    from public.mastery_records as mastery
    where mastery.user_id = (select auth.uid())
      and mastery.next_review_at is not null
      and mastery.next_review_at <= now()
  ),
  streak as (
    select profile.streak_days, profile.last_active_at
    from public.profiles as profile
    where profile.id = (select auth.uid())
  ),
  feed as (
    -- Items waiting right now.
    select
      'review'::text as kind,
      due.items || ' item' || case when due.items = 1 then '' else 's' end
        || ' due for review' as title,
      'Recall them now to keep them in memory longer.'::text as body,
      '/dashboard/review'::text as href,
      due.latest as occurred_at
    from due
    where due.items > 0

    union all

    -- A streak that will lapse at midnight unless something is studied.
    select
      'streak',
      'Your ' || streak.streak_days || '-day streak ends tonight',
      'Complete any quest today to keep it alive.',
      '/dashboard',
      streak.last_active_at
    from streak
    where streak.streak_days > 0
      and streak.last_active_at::date < current_date

    union all

    -- Achievements unlocked recently.
    select
      'achievement',
      'Achievement unlocked: ' || achievement.name,
      coalesce(achievement.description, 'Well earned.'),
      '/dashboard/achievements',
      unlocked.unlocked_at
    from public.user_achievements as unlocked
    join public.achievements as achievement on achievement.id = unlocked.achievement_id
    where unlocked.user_id = (select auth.uid())
      and unlocked.unlocked_at > now() - interval '14 days'

    union all

    -- Recent XP-earning activity.
    select
      'xp',
      log.title,
      'You earned ' || log.xp_earned || ' XP.',
      '/dashboard/analytics',
      log.created_at
    from public.activity_log as log
    where log.user_id = (select auth.uid())
      and log.xp_earned > 0
      and log.created_at > now() - interval '30 days'
  )
  select feed.kind, feed.title, feed.body, feed.href, feed.occurred_at
  from feed
  order by feed.occurred_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 8), 30));
$$;

revoke all on function public.get_notifications(integer) from public, anon;
grant execute on function public.get_notifications(integer) to authenticated, service_role;
