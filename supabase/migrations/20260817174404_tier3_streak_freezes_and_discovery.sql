-- Tier 3: systems the product implied but never had.
--
--   1. Streak protection. Missing a single day reset a 60-day streak to 1, with
--      no way to protect it. Learners now earn one freeze per completed week of
--      streak (max 2 banked); a missed day spends one and the streak survives.
--   2. Resume. The dashboard's "Continue Learning" was a static link to the
--      levels page; nothing tracked where the learner actually left off.
--   3. Search. There was no way to look up a word, kanji, or grammar point
--      across the curriculum — only filtering inside one page's own list.
--
-- Listening practice is deliberately not here: it needs recorded audio, which is
-- content work, and a synthesised stand-in would be worse than its absence.

-- ---------------------------------------------------------------------------
-- Streak freezes
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists streak_freezes integer not null default 0
    check (streak_freezes between 0 and 2);

-- Extracted so the rule is readable and testable on its own rather than buried
-- in the middle of award_xp.
create or replace function private.resolve_streak(
  p_last_active date,
  p_current_streak integer,
  p_freezes integer,
  out streak integer,
  out freezes integer,
  out freezes_spent integer
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_missed integer;
begin
  streak := greatest(coalesce(p_current_streak, 0), 0);
  freezes := greatest(coalesce(p_freezes, 0), 0);
  freezes_spent := 0;

  if p_last_active is null then
    streak := 1;
  elsif p_last_active >= current_date then
    -- Already counted today. Returning here also stops a second session on the
    -- same day from earning another freeze.
    return;
  elsif p_last_active = current_date - 1 then
    streak := streak + 1;
  else
    v_missed := (current_date - p_last_active) - 1;

    -- One freeze covers one missed day. A gap wider than the bank resets, so
    -- freezes protect a slip rather than an absence.
    if streak > 0 and v_missed > 0 and v_missed <= freezes then
      freezes := freezes - v_missed;
      freezes_spent := v_missed;
      streak := streak + 1;
    else
      streak := 1;
    end if;
  end if;

  -- Earn one per completed week, capped at 2.
  if streak > 0 and streak % 7 = 0 and freezes < 2 then
    freezes := freezes + 1;
  end if;
end;
$$;

revoke all on function private.resolve_streak(date, integer, integer)
  from public, anon, authenticated;

-- Freezes are server-awarded, so add them to the columns the account holder
-- cannot write directly.
create or replace function private.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if private.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Role cannot be changed by the account holder'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id then
    raise exception 'Profile identity cannot be changed' using errcode = '42501';
  end if;

  if new.xp is distinct from old.xp
    or new.streak_days is distinct from old.streak_days
    or new.streak_freezes is distinct from old.streak_freezes then
    raise exception 'Progress fields are awarded by the server' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_profile_privileges() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Resume point
-- ---------------------------------------------------------------------------

-- The most recent completed attempt, so the dashboard can offer to continue
-- what the learner was actually doing instead of a fixed link.
create or replace function public.get_resume_point()
returns table (
  activity_type text,
  last_at timestamptz,
  correct_answers integer,
  total_questions integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    attempt.activity_type,
    attempt.completed_at,
    attempt.correct_answers,
    attempt.total_questions
  from public.learning_attempts as attempt
  where attempt.user_id = (select auth.uid())
    and attempt.status = 'completed'
    and attempt.completed_at is not null
  order by attempt.completed_at desc
  limit 1;
$$;

revoke all on function public.get_resume_point() from public, anon;
grant execute on function public.get_resume_point() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Curriculum search
-- ---------------------------------------------------------------------------

-- One query across every content family. Ranked so exact matches surface above
-- substring hits, which matters when searching a single kana or kanji.
create or replace function public.search_curriculum(
  p_query text,
  p_limit integer default 20
)
returns table (
  item_type text,
  item_id integer,
  title text,
  subtitle text,
  meaning text,
  jlpt_level text,
  rank integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with needle as (
    select
      btrim(coalesce(p_query, '')) as raw,
      '%' || btrim(coalesce(p_query, '')) || '%' as pattern
  )
  select * from (
    select
      'vocabulary'::text as item_type,
      vocabulary.id,
      coalesce(nullif(vocabulary.kanji, ''), vocabulary.hiragana) as title,
      vocabulary.hiragana as subtitle,
      vocabulary.english as meaning,
      vocabulary.jlpt_level,
      case
        when vocabulary.kanji = needle.raw or vocabulary.hiragana = needle.raw then 0
        when lower(vocabulary.romaji) = lower(needle.raw)
          or lower(vocabulary.english) = lower(needle.raw) then 1
        else 2
      end as rank
    from public.vocabulary, needle
    where needle.raw <> ''
      and (
        vocabulary.kanji ilike needle.pattern
        or vocabulary.hiragana ilike needle.pattern
        or vocabulary.romaji ilike needle.pattern
        or vocabulary.english ilike needle.pattern
      )

    union all

    select
      'kanji',
      kanji.id,
      kanji."character",
      kanji.hiragana,
      array_to_string(kanji.meaning_en, ', '),
      kanji.jlpt_level,
      case
        when kanji."character" = needle.raw then 0
        when lower(kanji.romaji) = lower(needle.raw) then 1
        else 2
      end
    from public.kanji, needle
    where needle.raw <> ''
      and (
        kanji."character" ilike needle.pattern
        or kanji.romaji ilike needle.pattern
        or array_to_string(kanji.meaning_en, ', ') ilike needle.pattern
      )

    union all

    select
      'kana',
      kana.id,
      kana."character",
      kana.type,
      kana.romaji,
      'N5',
      case
        when kana."character" = needle.raw or lower(kana.romaji) = lower(needle.raw) then 0
        else 2
      end
    from public.kana, needle
    where needle.raw <> ''
      and (kana."character" ilike needle.pattern or kana.romaji ilike needle.pattern)

    union all

    select
      'grammar',
      grammar.id,
      grammar.title,
      grammar.pattern,
      grammar.meaning,
      grammar.jlpt_level,
      case when lower(grammar.title) = lower(needle.raw) then 0 else 2 end
    from public.grammar_patterns as grammar, needle
    where needle.raw <> ''
      and (
        grammar.title ilike needle.pattern
        or grammar.pattern ilike needle.pattern
        or grammar.meaning ilike needle.pattern
      )
  ) as hits
  order by hits.rank, hits.item_type, hits.title
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

revoke all on function public.search_curriculum(text, integer) from public, anon;
grant execute on function public.search_curriculum(text, integer) to authenticated, service_role;

