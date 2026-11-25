-- Phase 1 mobile exam history. Mock scores are learner-owned practice data;
-- they are intentionally separate from server-graded XP and achievements.
create table public.mock_exam_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null check (char_length(exam_id) between 1 and 80),
  exam_title text not null check (char_length(exam_title) between 1 and 120),
  mode text not null check (mode in ('full', 'section')),
  section_id text check (
    section_id is null
    or section_id in ('vocabulary', 'grammar-reading', 'listening')
  ),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  correct_answers integer not null check (correct_answers >= 0),
  total_questions integer not null check (total_questions > 0),
  raw_score_percent integer not null check (raw_score_percent between 0 and 100),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  section_results jsonb not null default '[]'::jsonb check (jsonb_typeof(section_results) = 'array'),
  created_at timestamptz not null default now(),
  constraint mock_exam_attempts_score_bounds check (correct_answers <= total_questions),
  constraint mock_exam_attempts_mode_section_check check (
    (mode = 'full' and section_id is null)
    or (mode = 'section' and section_id is not null)
  )
);

create index mock_exam_attempts_user_completed_idx
  on public.mock_exam_attempts (user_id, completed_at desc);

comment on table public.mock_exam_attempts is
  'Learner-owned raw practice results for original JapanGoLearn mock exams; not official JLPT scores.';

alter table public.mock_exam_attempts enable row level security;

-- Explicit grants opt this table into the Data API.
revoke all on table public.mock_exam_attempts from public, anon;
grant select, insert, update on table public.mock_exam_attempts to authenticated;

create policy "Learners can read their own mock attempts"
  on public.mock_exam_attempts for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Learners can insert their own mock attempts"
  on public.mock_exam_attempts for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Learners can update their own mock attempts"
  on public.mock_exam_attempts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
