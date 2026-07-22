-- Keep fresh local databases and the upgraded hosted database on one public
-- type contract. Legacy progress fields remain available during the mobile
-- transition, while canonical fields continue to drive new code.

alter table public.achievements
  alter column icon set default '🏆',
  alter column category set default 'general';

update public.blog_posts set content = '' where content is null;
alter table public.blog_posts alter column content set not null;

update public.contact_submissions
set
  name = coalesce(name, ''),
  email = coalesce(email, ''),
  message = coalesce(message, '');
alter table public.contact_submissions
  alter column name set not null,
  alter column email set not null,
  alter column message set not null;

alter table public.grammar_patterns alter column order_index set default 0;
alter table public.kana alter column sort_order set default 0;
alter table public.kanji alter column order_index set default 0;
alter table public.vocabulary alter column kanji drop default;

alter table public.user_kana_progress
  add column if not exists mastery integer default 0,
  add column if not exists times_practiced integer default 0,
  add column if not exists correct_count integer default 0,
  add column if not exists incorrect_count integer default 0,
  add column if not exists last_practiced_at timestamptz;

alter table public.user_kanji_progress
  add column if not exists mastery integer default 0,
  add column if not exists times_practiced integer default 0,
  add column if not exists correct_count integer default 0,
  add column if not exists incorrect_count integer default 0,
  add column if not exists last_practiced_at timestamptz;

alter table public.user_level_progress
  add column if not exists started_at timestamptz default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_level_progress'::regclass
      and conname = 'user_level_progress_jlpt_level_fkey'
  ) then
    alter table public.user_level_progress
      add constraint user_level_progress_jlpt_level_fkey
      foreign key (jlpt_level) references public.jlpt_levels(id);
  end if;
end;
$$;
