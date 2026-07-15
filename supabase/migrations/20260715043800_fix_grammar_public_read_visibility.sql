-- Grammar patterns are public learning content in the mobile and web apps.
-- Keep the table read-only for API clients while allowing both signed-out
-- visitors (anon) and signed-in users (authenticated) to read every pattern.

alter table public.grammar_patterns enable row level security;

drop policy if exists "Grammar patterns are viewable by authenticated users"
  on public.grammar_patterns;
drop policy if exists "Grammar patterns are publicly readable"
  on public.grammar_patterns;

create policy "Grammar patterns are publicly readable"
  on public.grammar_patterns
  for select
  to anon, authenticated
  using (true);

revoke all on table public.grammar_patterns from anon, authenticated;
grant select on table public.grammar_patterns to anon, authenticated;
