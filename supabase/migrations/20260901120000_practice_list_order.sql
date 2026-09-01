-- Manual ordering for practice lists.
--
-- The Practice hub lets a learner drag their lists into priority order. That
-- order needs to persist, so each list gets an integer sort_order the client
-- writes on reorder and reads on load.

alter table public.practice_lists
  add column if not exists sort_order integer not null default 0;

-- Backfill existing rows to the order they are shown in today — the smart
-- "Needs Practice" list first, then newest first — so nothing jumps around the
-- first time the column is read.
with ordered as (
  select
    id,
    row_number() over (
      partition by user_id
      order by is_smart_list desc, created_at desc
    ) as rn
  from public.practice_lists
)
update public.practice_lists as p
set sort_order = ordered.rn
from ordered
where ordered.id = p.id;

-- Column-scoped grants are used on this table, so the new column must be
-- granted explicitly or the client could neither read nor reorder it. The
-- owner-scoped RLS policies already constrain which rows each user may touch.
grant select (sort_order), insert (sort_order), update (sort_order)
  on public.practice_lists to authenticated;

-- Serves the list query's ORDER BY sort_order per user.
create index if not exists practice_lists_user_sort_idx
  on public.practice_lists (user_id, sort_order);
