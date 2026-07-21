-- Converge columns created by the original hosted schema with the stricter
-- application contract captured in the reproducible baseline. This migration
-- is additive: legacy progress columns are retained while their canonical
-- replacements are added and backfilled.

alter table public.achievements
  alter column id set default extensions.gen_random_uuid()::text,
  alter column xp_reward set default 0;
update public.achievements set xp_reward = 0 where xp_reward is null;
alter table public.achievements alter column xp_reward set not null;

update public.activity_log
set
  created_at = coalesce(created_at, now()),
  description = coalesce(description, ''),
  xp_earned = coalesce(xp_earned, 0);
alter table public.activity_log
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column description set default '',
  alter column description set not null,
  alter column user_id set not null,
  alter column xp_earned set default 0,
  alter column xp_earned set not null;

update public.blog_posts
set
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now()),
  published = coalesce(published, false);
alter table public.blog_posts
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  alter column published set default false,
  alter column published set not null;

update public.contact_submissions
set
  created_at = coalesce(created_at, now()),
  read = coalesce(read, false);
alter table public.contact_submissions
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column read set default false,
  alter column read set not null;

update public.daily_goals
set
  date = coalesce(date, current_date),
  xp_earned = coalesce(xp_earned, 0),
  xp_target = coalesce(xp_target, 100),
  tasks_completed = coalesce(tasks_completed, 0),
  tasks_total = coalesce(tasks_total, 3);
alter table public.daily_goals
  alter column user_id set not null,
  alter column date set default current_date,
  alter column date set not null,
  alter column xp_earned set default 0,
  alter column xp_earned set not null,
  alter column xp_target set default 100,
  alter column xp_target set not null,
  alter column tasks_completed set default 0,
  alter column tasks_completed set not null,
  alter column tasks_total set default 3,
  alter column tasks_total set not null;

update public.jlpt_levels
set
  level = coalesce(level, id),
  total_kanji = coalesce(total_kanji, 0),
  total_vocabulary = coalesce(total_vocabulary, 0),
  total_grammar = coalesce(total_grammar, 0);
alter table public.jlpt_levels
  alter column level set not null,
  alter column total_kanji set default 0,
  alter column total_kanji set not null,
  alter column total_vocabulary set default 0,
  alter column total_vocabulary set not null,
  alter column total_grammar set default 0,
  alter column total_grammar set not null;

alter table public.kana
  add column if not exists created_at timestamptz not null default now();
update public.kana
set
  icon = coalesce(icon, ''),
  romaji_hindi = coalesce(romaji_hindi, ''),
  stroke_hint = coalesce(stroke_hint, ''),
  is_dakuten = coalesce(is_dakuten, false),
  is_combo = coalesce(is_combo, false);
alter table public.kana
  alter column icon set default '',
  alter column icon set not null,
  alter column romaji_hindi set default '',
  alter column romaji_hindi set not null,
  alter column stroke_hint set default '',
  alter column stroke_hint set not null,
  alter column is_dakuten set default false,
  alter column is_dakuten set not null,
  alter column is_combo set default false,
  alter column is_combo set not null;

alter table public.kanji
  add column if not exists updated_at timestamptz not null default now();
update public.kanji
set
  icon = coalesce(icon, ''),
  hiragana = coalesce(hiragana, ''),
  romaji = coalesce(romaji, ''),
  hindi_pronunciation = coalesce(hindi_pronunciation, ''),
  meaning_hi = coalesce(meaning_hi, '{}'),
  radical = coalesce(radical, ''),
  related_kanji = coalesce(related_kanji, '{}'),
  stroke_count = coalesce(stroke_count, 1),
  tags = coalesce(tags, '{}'),
  confusable_kanji = coalesce(confusable_kanji, '{}'),
  created_at = coalesce(created_at, now());
alter table public.kanji
  alter column icon set default '',
  alter column icon set not null,
  alter column hiragana set default '',
  alter column hiragana set not null,
  alter column romaji set default '',
  alter column romaji set not null,
  alter column hindi_pronunciation set default '',
  alter column hindi_pronunciation set not null,
  alter column meaning_hi set default '{}',
  alter column meaning_hi set not null,
  alter column radical set default '',
  alter column radical set not null,
  alter column related_kanji set default '{}',
  alter column related_kanji set not null,
  alter column stroke_count set default 1,
  alter column stroke_count set not null,
  alter column tags set default '{}',
  alter column tags set not null,
  alter column confusable_kanji set default '{}',
  alter column confusable_kanji set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

update public.practice_list_items
set
  created_at = coalesce(created_at, now()),
  mastery_score = coalesce(mastery_score, 0);
alter table public.practice_list_items
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column mastery_score set default 0,
  alter column mastery_score set not null;

update public.practice_lists
set
  created_at = coalesce(created_at, now()),
  is_smart_list = coalesce(is_smart_list, false);
alter table public.practice_lists
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column is_smart_list set default false,
  alter column is_smart_list set not null;

update public.profiles
set
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now()),
  current_jlpt_level = coalesce(current_jlpt_level, 'N5'),
  role = coalesce(role, 'user'),
  onboarding_completed = coalesce(onboarding_completed, false),
  xp = coalesce(xp, 0),
  streak_days = coalesce(streak_days, 0);
alter table public.profiles
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  alter column current_jlpt_level set default 'N5',
  alter column current_jlpt_level set not null,
  alter column role set default 'user',
  alter column role set not null,
  alter column onboarding_completed set default false,
  alter column onboarding_completed set not null,
  alter column xp set default 0,
  alter column xp set not null,
  alter column streak_days set default 0,
  alter column streak_days set not null;

update public.user_achievements
set unlocked_at = coalesce(unlocked_at, now());
alter table public.user_achievements
  alter column user_id set not null,
  alter column achievement_id set not null,
  alter column unlocked_at set default now(),
  alter column unlocked_at set not null;

alter table public.user_kana_progress
  add column if not exists mastery_score numeric(5, 2),
  add column if not exists last_reviewed timestamptz,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;
update public.user_kana_progress
set
  mastery_score = coalesce(
    mastery_score,
    greatest(0, least(100, coalesce(mastery, 0)))
  ),
  last_reviewed = coalesce(last_reviewed, last_practiced_at),
  created_at = coalesce(created_at, last_practiced_at, now()),
  updated_at = coalesce(updated_at, last_practiced_at, now());
alter table public.user_kana_progress
  alter column user_id set not null,
  alter column kana_id set not null,
  alter column mastery_score set default 0,
  alter column mastery_score set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.user_kanji_progress
  add column if not exists mastery_score numeric(5, 2),
  add column if not exists last_reviewed timestamptz,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;
update public.user_kanji_progress
set
  mastery_score = coalesce(
    mastery_score,
    greatest(0, least(100, coalesce(mastery, 0)))
  ),
  last_reviewed = coalesce(last_reviewed, last_practiced_at),
  created_at = coalesce(created_at, last_practiced_at, now()),
  updated_at = coalesce(updated_at, last_practiced_at, now());
alter table public.user_kanji_progress
  alter column user_id set not null,
  alter column kanji_id set not null,
  alter column mastery_score set default 0,
  alter column mastery_score set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.user_level_progress
  add column if not exists unlocked_at timestamptz;
update public.user_level_progress
set
  progress_percent = coalesce(progress_percent, 0),
  unlocked_at = coalesce(unlocked_at, started_at, now());
alter table public.user_level_progress
  alter column user_id set not null,
  alter column jlpt_level set not null,
  alter column progress_percent set default 0,
  alter column progress_percent set not null,
  alter column unlocked_at set default now(),
  alter column unlocked_at set not null;

update public.user_streaks
set
  current_streak = coalesce(current_streak, 0),
  longest_streak = coalesce(longest_streak, current_streak, 0),
  updated_at = coalesce(updated_at, now());
alter table public.user_streaks
  alter column current_streak set default 0,
  alter column current_streak set not null,
  alter column longest_streak set default 0,
  alter column longest_streak set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.vocabulary
  add column if not exists updated_at timestamptz not null default now();
update public.vocabulary
set
  created_at = coalesce(created_at, now()),
  jlpt_level = coalesce(jlpt_level, 'N5'),
  romaji_hindi = coalesce(romaji_hindi, '');
alter table public.vocabulary
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column jlpt_level set default 'N5',
  alter column jlpt_level set not null,
  alter column romaji_hindi set default '',
  alter column romaji_hindi set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.practice_lists'::regclass
      and conname = 'practice_lists_user_id_fkey'
  ) then
    alter table public.practice_lists
      add constraint practice_lists_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_streaks'::regclass
      and conname = 'user_streaks_user_id_fkey'
  ) then
    alter table public.user_streaks
      add constraint user_streaks_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end;
$$;
