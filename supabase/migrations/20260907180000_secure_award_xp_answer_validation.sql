-- Server-side answer grading for XP and learning progress.
--
-- The public RPC accepts only raw answer data. Correctness, question count,
-- canonical answers, mastery signal, and XP are derived inside the database.

create or replace function private.normalize_learning_answer(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(btrim(coalesce(p_value, '')), E'\\s+', ' ', 'g'));
$$;

create or replace function private.grade_learning_answers(
  p_activity_type text,
  p_user_id uuid,
  p_answers jsonb
)
returns table (
  ordinal bigint,
  item_type text,
  item_id text,
  prompt text,
  answer text,
  correct_answer text,
  response_ms integer,
  is_correct boolean,
  is_valid boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with submitted as (
    select
      elements.ordinality,
      elements.entry,
      elements.entry ->> 'item_type' as item_type,
      elements.entry ->> 'item_id' as item_id,
      elements.entry ->> 'answer' as raw_answer,
      case
        when elements.entry ->> 'answer' is not null
          then left(elements.entry ->> 'answer', 400)
      end as answer,
      case
        when elements.entry ->> 'response_ms' ~ '^[0-9]{1,8}$'
          then least((elements.entry ->> 'response_ms')::integer, 3600000)
        else null
      end as response_ms
    from jsonb_array_elements(p_answers) with ordinality as elements(entry, ordinality)
  ),
  resolved as (
    select
      submitted.*,
      case submitted.item_type
        when 'vocabulary' then coalesce(nullif(vocabulary.kanji, ''), vocabulary.hiragana)
        when 'kanji' then kanji.character
        when 'kana' then kana.character
        when 'grammar' then grammar.title
      end as prompt,
      case submitted.item_type
        when 'vocabulary' then vocabulary.english
        when 'kanji' then array_to_string(kanji.meaning_en, ', ')
        when 'kana' then kana.romaji
        when 'grammar' then grammar.meaning
      end as correct_answer,
      vocabulary.english as vocabulary_answer,
      kana.romaji as kana_answer,
      kanji.meaning_en as kanji_answers,
      grammar.meaning as grammar_answer,
      case submitted.item_type
        when 'vocabulary' then vocabulary.id is not null
        when 'kanji' then kanji.id is not null
        when 'kana' then kana.id is not null
        when 'grammar' then grammar.id is not null
        else false
      end as content_exists
    from submitted
    left join public.vocabulary as vocabulary
      on submitted.item_type = 'vocabulary'
      and vocabulary.id::text = submitted.item_id
    left join public.kanji as kanji
      on submitted.item_type = 'kanji'
      and kanji.id::text = submitted.item_id
    left join public.kana as kana
      on submitted.item_type = 'kana'
      and kana.id::text = submitted.item_id
    left join public.grammar_patterns as grammar
      on submitted.item_type = 'grammar'
      and grammar.id::text = submitted.item_id
  ),
  graded as (
    select
      resolved.*,
      case resolved.item_type
        when 'vocabulary' then
          private.normalize_learning_answer(resolved.answer)
            = private.normalize_learning_answer(resolved.vocabulary_answer)
        when 'kana' then
          private.normalize_learning_answer(resolved.answer)
            = private.normalize_learning_answer(resolved.kana_answer)
        when 'kanji' then
          private.normalize_learning_answer(resolved.answer)
            = private.normalize_learning_answer(resolved.correct_answer)
          or exists (
            select 1
            from unnest(coalesce(resolved.kanji_answers, '{}'::text[])) as meaning(value)
            where private.normalize_learning_answer(resolved.answer)
              = private.normalize_learning_answer(meaning.value)
          )
        when 'grammar' then
          private.normalize_learning_answer(resolved.answer)
            = private.normalize_learning_answer(resolved.grammar_answer)
        else false
      end as computed_correct,
      (
        jsonb_typeof(resolved.entry) = 'object'
        and resolved.item_type is not null
        and resolved.item_id is not null
        and resolved.item_id <> ''
        and length(resolved.item_id) <= 64
        and resolved.item_id ~ '^[0-9]+$'
        and resolved.raw_answer is not null
        and length(resolved.raw_answer) <= 400
        and (
          (p_activity_type = 'vocabulary_quiz' and resolved.item_type = 'vocabulary')
          or (p_activity_type = 'grammar_quiz' and resolved.item_type = 'grammar')
          or (
            p_activity_type = 'writing_quiz'
            and resolved.item_type in ('kana', 'kanji')
          )
          or (
            p_activity_type in ('practice_quiz', 'review_session')
            and resolved.item_type in ('vocabulary', 'kana', 'kanji', 'grammar')
          )
        )
        and resolved.content_exists
        and (
          p_activity_type <> 'review_session'
          or exists (
            select 1
            from public.mastery_records as due
            where due.user_id = p_user_id
              and due.item_type = resolved.item_type
              and due.item_id = resolved.item_id
              and due.next_review_at is not null
              and due.next_review_at <= now()
          )
        )
      ) as valid
    from resolved
  )
  select
    graded.ordinality,
    graded.item_type,
    graded.item_id,
    graded.prompt,
    graded.answer,
    graded.correct_answer,
    graded.response_ms,
    case when graded.valid then graded.computed_correct else false end,
    graded.valid
  from graded;
$$;

revoke all on function private.normalize_learning_answer(text)
  from public, anon, authenticated, service_role;
revoke all on function private.grade_learning_answers(text, uuid, jsonb)
  from public, anon, authenticated, service_role;

-- Keep the existing atomic progression writes private. The public wrapper below
-- supplies it only with counts and per-item results derived by this migration.
alter function public.award_xp(text, integer, integer, text, jsonb) set schema private;
alter function private.award_xp(text, integer, integer, text, jsonb)
  rename to award_xp_legacy;

revoke all on function private.award_xp_legacy(text, integer, integer, text, jsonb)
  from public, anon, authenticated, service_role;

drop function if exists public.award_xp(text, integer, integer, text, jsonb);
drop function if exists public.award_xp(text, integer, integer, text);
drop function if exists public.award_xp(text, text, text, integer);

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
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_total_questions integer;
  v_max_questions integer;
  v_valid_answers integer;
  v_distinct_answers integer;
  v_correct_answers integer;
  v_graded_answers jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  case p_activity_type
    when 'vocabulary_quiz' then v_max_questions := 15;
    when 'grammar_quiz' then v_max_questions := 10;
    when 'writing_quiz' then v_max_questions := 250;
    when 'practice_quiz' then v_max_questions := 100;
    when 'review_session' then v_max_questions := 100;
    else
      raise exception 'Unsupported learning activity type' using errcode = '22023';
  end case;

  if p_attempt_key is null
    or p_attempt_key !~ '^[A-Za-z0-9._:-]{12,128}$' then
    raise exception 'Invalid attempt key' using errcode = '22023';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Answers must be a JSON array' using errcode = '22023';
  end if;

  v_total_questions := jsonb_array_length(p_answers);
  if v_total_questions < 1 or v_total_questions > v_max_questions then
    raise exception 'Invalid answer count' using errcode = '22023';
  end if;

  select
    count(*) filter (where graded.is_valid)::integer,
    count(distinct graded.item_type || ':' || graded.item_id)
      filter (where graded.is_valid)::integer,
    count(*) filter (where graded.is_valid and graded.is_correct)::integer,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'item_type', graded.item_type,
          'item_id', graded.item_id,
          'prompt', graded.prompt,
          'answer', graded.answer,
          'correct_answer', graded.correct_answer,
          'is_correct', graded.is_correct,
          'response_ms', graded.response_ms
        )
        order by graded.ordinal
      ) filter (where graded.is_valid),
      '[]'::jsonb
    )
  into v_valid_answers, v_distinct_answers, v_correct_answers, v_graded_answers
  from private.grade_learning_answers(p_activity_type, v_user_id, p_answers) as graded;

  if v_valid_answers <> v_total_questions then
    raise exception 'Invalid answer payload' using errcode = '22023';
  end if;

  if v_distinct_answers <> v_total_questions then
    raise exception 'Duplicate answer item' using errcode = '22023';
  end if;

  return query
    select *
    from private.award_xp_legacy(
      p_activity_type,
      v_correct_answers,
      v_total_questions,
      p_attempt_key,
      v_graded_answers
    );
end;
$$;

revoke all on function public.award_xp(text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.award_xp(text, text, jsonb)
  to authenticated, service_role;
