-- Function to reliably increment or reset user streaks
create or replace function increment_streak()
returns void as $$
declare
  v_user_id uuid;
  v_streak record;
  v_today date;
  v_last_practice date;
begin
  -- Get the current authenticated user inside the function
  v_user_id := auth.uid();
  if v_user_id is null then
    return;
  end if;

  v_today := current_date;

  -- Get current streak info
  select * into v_streak from user_streaks where user_id = v_user_id for update;

  if not found then
    -- No record exists yet, create one with streak 1
    insert into user_streaks (user_id, current_streak, longest_streak, last_practice_date)
    values (v_user_id, 1, 1, v_today);
  else
    v_last_practice := v_streak.last_practice_date;

    if v_last_practice is null then
      -- First time practicing
      update user_streaks
      set current_streak = 1,
          longest_streak = greatest(1, v_streak.longest_streak),
          last_practice_date = v_today,
          updated_at = now()
      where user_id = v_user_id;

    elsif v_last_practice = v_today then
      -- Already practiced today, do nothing to streak, but maybe update last_practice_time if we tracked time
      -- We'll just update updated_at to track activity
      update user_streaks set updated_at = now() where user_id = v_user_id;

    elsif v_last_practice = (v_today - interval '1 day')::date then
      -- Practiced yesterday, increment streak
      update user_streaks
      set current_streak = v_streak.current_streak + 1,
          longest_streak = greatest(v_streak.current_streak + 1, v_streak.longest_streak),
          last_practice_date = v_today,
          updated_at = now()
      where user_id = v_user_id;

    else
      -- Missed a day or more, reset streak
      update user_streaks
      set current_streak = 1,
          longest_streak = greatest(1, v_streak.longest_streak),
          last_practice_date = v_today,
          updated_at = now()
      where user_id = v_user_id;
    end if;
  end if;
end;
$$ language plpgsql security definer;
