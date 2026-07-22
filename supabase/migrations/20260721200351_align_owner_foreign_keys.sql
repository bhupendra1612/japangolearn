-- The hosted schema originally referenced auth.users directly for these
-- application-owned records. Point them at profiles so the public schema has
-- a single ownership boundary and generated API relationships stay intact.

alter table public.practice_lists
  drop constraint practice_lists_user_id_fkey,
  add constraint practice_lists_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.user_streaks
  drop constraint user_streaks_user_id_fkey,
  add constraint user_streaks_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;
