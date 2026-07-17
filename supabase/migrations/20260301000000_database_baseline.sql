-- Complete reproducible baseline for JapanGoLearn.
-- This migration is intentionally additive so it can also be applied to the
-- existing hosted project without replacing or truncating production data.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  current_jlpt_level text not null default 'N5'
    check (current_jlpt_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  xp integer not null default 0 check (xp >= 0),
  streak_days integer not null default 0 check (streak_days >= 0),
  onboarding_completed boolean not null default false,
  role text not null default 'user' check (role in ('user', 'admin')),
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jlpt_levels (
  id text primary key,
  level text not null unique,
  name text not null,
  title text,
  description text,
  order_index integer not null,
  sort_order integer,
  total_kanji integer not null default 0 check (total_kanji >= 0),
  total_vocabulary integer not null default 0 check (total_vocabulary >= 0),
  total_grammar integer not null default 0 check (total_grammar >= 0),
  color text,
  icon_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_level_progress (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  jlpt_level text not null check (jlpt_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  progress_percent numeric(5, 2) not null default 0
    check (progress_percent between 0 and 100),
  unlocked_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, jlpt_level)
);

create table if not exists public.blog_posts (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  cover_image_url text,
  author_id uuid references public.profiles(id),
  published boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_submissions (
  id uuid primary key default extensions.gen_random_uuid(),
  name text,
  email text,
  subject text,
  message text,
  read boolean not null default false,
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'spam')),
  created_at timestamptz not null default now()
);

create table if not exists public.daily_goals (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  xp_earned integer not null default 0 check (xp_earned >= 0),
  xp_target integer not null default 100 check (xp_target > 0),
  tasks_completed integer not null default 0 check (tasks_completed >= 0),
  tasks_total integer not null default 3 check (tasks_total > 0),
  vocabulary_done integer not null default 0 check (vocabulary_done >= 0),
  grammar_done integer not null default 0 check (grammar_done >= 0),
  writing_done integer not null default 0 check (writing_done >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.activity_log (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  description text not null default '',
  xp_earned integer not null default 0 check (xp_earned >= 0),
  metadata jsonb,
  award_key text,
  created_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id text primary key default extensions.gen_random_uuid()::text,
  name text not null,
  description text,
  icon text not null,
  xp_reward integer not null default 0 check (xp_reward >= 0),
  category text not null,
  condition jsonb
);

create table if not exists public.user_achievements (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create table if not exists public.vocabulary (
  id bigint generated by default as identity primary key,
  kanji text not null default '',
  hiragana text not null,
  romaji text not null,
  romaji_hindi text not null default '',
  english text not null,
  topic text not null,
  jlpt_level text not null default 'N5'
    check (jlpt_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kana (
  id bigint generated by default as identity primary key,
  character text not null,
  romaji text not null,
  romaji_hindi text not null default '',
  icon text not null default '',
  type text not null check (type in ('hiragana', 'katakana')),
  group_name text not null,
  stroke_count integer not null default 1 check (stroke_count > 0),
  stroke_hint text not null default '',
  sort_order integer not null,
  is_dakuten boolean not null default false,
  is_combo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (character, type)
);

create table if not exists public.user_kana_progress (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kana_id bigint not null references public.kana(id) on delete cascade,
  mastery_score numeric(5, 2) not null default 0 check (mastery_score between 0 and 100),
  last_reviewed timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kana_id)
);

create table if not exists public.grammar_patterns (
  id bigint generated by default as identity primary key,
  title text not null,
  pattern text not null default '',
  structure text not null,
  meaning text not null,
  explanation text not null,
  examples jsonb not null default '[]'::jsonb,
  jlpt_level text not null default 'N5'
    check (jlpt_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  category text not null,
  order_index integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.practice_lists (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  is_smart_list boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.practice_list_items (
  id uuid primary key default extensions.gen_random_uuid(),
  list_id uuid not null references public.practice_lists(id) on delete cascade,
  item_id bigint not null,
  item_type text not null check (item_type in ('vocabulary', 'kana', 'kanji', 'grammar')),
  mastery_score numeric(5, 2) not null default 0 check (mastery_score between 0 and 100),
  last_reviewed timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (list_id, item_type, item_id)
);

create table if not exists public.user_streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= current_streak),
  last_practice_date date,
  updated_at timestamptz not null default now()
);

create table if not exists public.kanji (
  id bigint generated by default as identity primary key,
  character text not null unique,
  icon text not null default '',
  hiragana text not null default '',
  romaji text not null default '',
  hindi_pronunciation text not null default '',
  meaning_en text[] not null default '{}',
  meaning_hi text[] not null default '{}',
  stroke_count integer not null default 1 check (stroke_count > 0),
  radical text not null default '',
  jlpt_level text not null default 'N5'
    check (jlpt_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  order_index integer not null,
  frequency_rank text,
  mnemonic text,
  writing_tip text,
  kunyomi jsonb not null default '[]'::jsonb,
  onyomi jsonb not null default '[]'::jsonb,
  vocabulary jsonb not null default '[]'::jsonb,
  example_sentences jsonb not null default '[]'::jsonb,
  related_kanji text[] not null default '{}',
  confusable_kanji text[] not null default '{}',
  image_url text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_kanji_progress (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kanji_id bigint not null references public.kanji(id) on delete cascade,
  mastery_score numeric(5, 2) not null default 0 check (mastery_score between 0 and 100),
  last_reviewed timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kanji_id)
);

-- Converge the older hosted schema on the baseline without replacing data.
alter table public.jlpt_levels
  add column if not exists level text,
  add column if not exists title text,
  add column if not exists sort_order integer,
  add column if not exists created_at timestamptz not null default now();
update public.jlpt_levels
set
  level = coalesce(level, id),
  sort_order = coalesce(sort_order, order_index)
where level is null or sort_order is null;
create unique index if not exists jlpt_levels_level_key on public.jlpt_levels (level);

insert into public.jlpt_levels (
  id, level, name, title, description, order_index, sort_order,
  total_kanji, total_vocabulary, total_grammar, color
)
values
  ('N5', 'N5', 'N5', 'Beginner', 'Foundational Japanese for everyday situations.', 1, 1, 100, 800, 50, '#22c55e'),
  ('N4', 'N4', 'N4', 'Elementary', 'Elementary grammar, vocabulary and kanji.', 2, 2, 300, 1500, 150, '#3b82f6'),
  ('N3', 'N3', 'N3', 'Intermediate', 'Intermediate reading and conversation.', 3, 3, 650, 3750, 350, '#8b5cf6'),
  ('N2', 'N2', 'N2', 'Upper Intermediate', 'Professional and academic Japanese.', 4, 4, 1000, 6000, 600, '#f59e0b'),
  ('N1', 'N1', 'N1', 'Advanced', 'Advanced comprehension and expression.', 5, 5, 2000, 10000, 900, '#ef4444')
on conflict (id) do update
set
  level = excluded.level,
  name = excluded.name,
  title = excluded.title,
  description = excluded.description,
  order_index = excluded.order_index,
  sort_order = excluded.sort_order,
  total_kanji = excluded.total_kanji,
  total_vocabulary = excluded.total_vocabulary,
  total_grammar = excluded.total_grammar,
  color = excluded.color;

alter table public.blog_posts
  add column if not exists cover_image_url text,
  add column if not exists author_id uuid references public.profiles(id),
  add column if not exists published boolean not null default false,
  add column if not exists status text not null default 'draft';
update public.blog_posts
set status = 'published'
where published is true and status = 'draft';

alter table public.contact_submissions
  add column if not exists read boolean not null default false,
  add column if not exists status text not null default 'new';

alter table public.daily_goals
  add column if not exists vocabulary_done integer not null default 0,
  add column if not exists grammar_done integer not null default 0,
  add column if not exists writing_done integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.grammar_patterns
  add column if not exists pattern text not null default '',
  add column if not exists updated_at timestamptz not null default now();

alter table public.practice_lists
  add column if not exists updated_at timestamptz not null default now();
alter table public.practice_list_items
  add column if not exists updated_at timestamptz not null default now();
alter table public.practice_list_items
  drop constraint if exists practice_list_items_item_type_check;
alter table public.practice_list_items
  add constraint practice_list_items_item_type_check
  check (item_type in ('vocabulary', 'kana', 'kanji', 'grammar'));

create index if not exists blog_posts_author_id_idx on public.blog_posts (author_id);

create unique index if not exists activity_log_user_award_key_key
  on public.activity_log (user_id, award_key)
  where award_key is not null;
create index if not exists activity_log_user_created_at_idx
  on public.activity_log (user_id, created_at desc);
create index if not exists daily_goals_user_date_idx
  on public.daily_goals (user_id, date desc);
create index if not exists user_achievements_achievement_id_idx
  on public.user_achievements (achievement_id);
create index if not exists user_level_progress_user_id_idx
  on public.user_level_progress (user_id);
create index if not exists user_kana_progress_kana_id_idx
  on public.user_kana_progress (kana_id);
create index if not exists user_kanji_progress_kanji_id_idx
  on public.user_kanji_progress (kanji_id);
create index if not exists practice_lists_user_id_idx
  on public.practice_lists (user_id);
create index if not exists practice_list_items_list_id_idx
  on public.practice_list_items (list_id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'blog_posts', 'daily_goals', 'vocabulary', 'user_kana_progress',
    'grammar_patterns', 'practice_lists', 'practice_list_items', 'user_streaks',
    'kanji', 'user_kanji_progress'
  ]
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      'set_' || table_name || '_updated_at',
      table_name
    );
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.set_updated_at()',
      'set_' || table_name || '_updated_at',
      table_name
    );
  end loop;
end;
$$;

do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    execute 'alter function public.set_updated_at() set search_path = pg_catalog';
    execute 'revoke all on function public.set_updated_at() from public, anon, authenticated';
  end if;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, current_jlpt_level)
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name'), ''),
    case
      when new.raw_user_meta_data ->> 'current_jlpt_level' in ('N5', 'N4', 'N3', 'N2', 'N1')
        then new.raw_user_meta_data ->> 'current_jlpt_level'
      else 'N5'
    end
  )
  on conflict (id) do nothing;

  insert into public.user_level_progress (user_id, jlpt_level, progress_percent)
  values (new.id, 'N5', 0)
  on conflict (user_id, jlpt_level) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
do $$
begin
  if to_regprocedure('public.handle_new_user()') is not null then
    execute 'drop function public.handle_new_user()';
  end if;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated, service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'jlpt_levels', 'user_level_progress', 'blog_posts',
    'contact_submissions', 'daily_goals', 'activity_log', 'achievements',
    'user_achievements', 'vocabulary', 'kana', 'user_kana_progress',
    'grammar_patterns', 'practice_lists', 'practice_list_items', 'user_streaks',
    'kanji', 'user_kanji_progress'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

-- User-owned records.
do $$
declare
  policy record;
begin
  for policy in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'profiles', 'jlpt_levels', 'user_level_progress', 'blog_posts',
        'contact_submissions', 'daily_goals', 'activity_log', 'achievements',
        'user_achievements', 'vocabulary', 'kana', 'user_kana_progress',
        'grammar_patterns', 'practice_lists', 'practice_list_items', 'user_streaks',
        'kanji', 'user_kanji_progress'
      ])
  loop
    execute format('drop policy %I on public.%I', policy.policyname, policy.tablename);
  end loop;
end;
$$;

do $$
begin
  if to_regprocedure('public.is_admin()') is not null then
    execute 'drop function public.is_admin()';
  end if;
end;
$$;

create policy "profiles_select_self_or_admin" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or (select private.is_admin()));
create policy "profiles_update_self_or_admin" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id or (select private.is_admin()))
  with check ((select auth.uid()) = id or (select private.is_admin()));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'user_level_progress', 'daily_goals', 'activity_log', 'user_achievements',
    'user_kana_progress', 'practice_lists', 'user_streaks', 'user_kanji_progress'
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

drop policy if exists "practice_list_items_select_owner" on public.practice_list_items;
create policy "practice_list_items_select_owner" on public.practice_list_items
  for select to authenticated
  using (
    exists (
      select 1 from public.practice_lists
      where practice_lists.id = practice_list_items.list_id
        and (practice_lists.user_id = (select auth.uid()) or (select private.is_admin()))
    )
  );

drop policy if exists "practice_lists_insert_owner" on public.practice_lists;
create policy "practice_lists_insert_owner" on public.practice_lists
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "practice_lists_update_owner" on public.practice_lists;
create policy "practice_lists_update_owner" on public.practice_lists
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "practice_lists_delete_owner" on public.practice_lists;
create policy "practice_lists_delete_owner" on public.practice_lists
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "practice_list_items_insert_owner" on public.practice_list_items;
create policy "practice_list_items_insert_owner" on public.practice_list_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.practice_lists
      where practice_lists.id = practice_list_items.list_id
        and practice_lists.user_id = (select auth.uid())
    )
  );
drop policy if exists "practice_list_items_update_owner" on public.practice_list_items;
create policy "practice_list_items_update_owner" on public.practice_list_items
  for update to authenticated
  using (
    exists (
      select 1 from public.practice_lists
      where practice_lists.id = practice_list_items.list_id
        and practice_lists.user_id = (select auth.uid())
    )
  );
drop policy if exists "practice_list_items_delete_owner" on public.practice_list_items;
create policy "practice_list_items_delete_owner" on public.practice_list_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.practice_lists
      where practice_lists.id = practice_list_items.list_id
        and practice_lists.user_id = (select auth.uid())
    )
  );

-- Public learning content and published posts.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'jlpt_levels', 'achievements', 'vocabulary', 'kana', 'grammar_patterns', 'kanji'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_public_read', table_name);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      table_name || '_public_read',
      table_name
    );
  end loop;
end;
$$;

drop policy if exists "blog_posts_public_read" on public.blog_posts;
create policy "blog_posts_public_read" on public.blog_posts
  for select to anon, authenticated
  using (status = 'published');
drop policy if exists "blog_posts_admin_read" on public.blog_posts;
create policy "blog_posts_admin_read" on public.blog_posts
  for select to authenticated
  using ((select private.is_admin()));

drop policy if exists "contact_submissions_create" on public.contact_submissions;
create policy "contact_submissions_create" on public.contact_submissions
  for insert to anon, authenticated
  with check (
    char_length(name) between 1 and 120
    and char_length(email) between 3 and 320
    and email like '%@%'
    and char_length(message) between 1 and 5000
    and char_length(coalesce(subject, '')) <= 200
    and status = 'new'
    and read is false
  );
drop policy if exists "contact_submissions_admin_read" on public.contact_submissions;
create policy "contact_submissions_admin_read" on public.contact_submissions
  for select to authenticated
  using ((select private.is_admin()));
drop policy if exists "contact_submissions_admin_update" on public.contact_submissions;
create policy "contact_submissions_admin_update" on public.contact_submissions
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Admin content management is policy-protected rather than service-key based.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'jlpt_levels', 'blog_posts', 'achievements', 'vocabulary', 'kana',
    'grammar_patterns', 'kanji'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_insert', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_update', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_delete', table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.is_admin()))',
      table_name || '_admin_insert',
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',
      table_name || '_admin_update',
      table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.is_admin()))',
      table_name || '_admin_delete',
      table_name
    );
  end loop;
end;
$$;

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.jlpt_levels, public.blog_posts, public.achievements,
  public.vocabulary, public.kana, public.grammar_patterns, public.kanji
  to anon, authenticated;
grant insert (name, email, subject, message)
  on public.contact_submissions to anon, authenticated;
grant select on public.profiles to authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url, current_jlpt_level, onboarding_completed)
  on public.profiles to authenticated;
grant select on public.user_level_progress, public.daily_goals, public.activity_log,
  public.user_achievements, public.user_kana_progress, public.user_streaks,
  public.user_kanji_progress to authenticated;
grant select, insert, update, delete on public.practice_lists, public.practice_list_items
  to authenticated;
grant insert, update, delete on public.jlpt_levels, public.blog_posts,
  public.achievements, public.vocabulary, public.kana, public.grammar_patterns,
  public.kanji to authenticated;
grant select, update on public.contact_submissions to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are publicly accessible." on storage.objects;
drop policy if exists "Anyone can upload an avatar." on storage.objects;
drop policy if exists "Anyone can update an avatar." on storage.objects;
drop policy if exists "avatar_public_read" on storage.objects;
drop policy if exists "avatar_owner_select" on storage.objects;
create policy "avatar_owner_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and owner_id = (select auth.uid())::text
  );

drop policy if exists "avatar_owner_insert" on storage.objects;
create policy "avatar_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (
        (storage.foldername(name))[1] = 'avatars'
        and (storage.foldername(name))[2] = (select auth.uid())::text
      )
    )
  );

drop policy if exists "avatar_owner_update" on storage.objects;
create policy "avatar_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and owner_id = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and owner_id = (select auth.uid())::text
  );

drop policy if exists "avatar_owner_delete" on storage.objects;
create policy "avatar_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and owner_id = (select auth.uid())::text
  );
