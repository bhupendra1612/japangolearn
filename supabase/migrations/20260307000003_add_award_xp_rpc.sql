-- supabase/migrations/20260307000003_add_award_xp_rpc.sql

-- Define the return type for checking unlocked achievements
CREATE TYPE achievement_unlock_result AS (
  unlocked_id uuid
);

-- Main RPC for awarding XP on the mobile app (where we can't easily rely on Next.js server actions safely)
CREATE OR REPLACE FUNCTION award_xp(
    p_type text,
    p_title text,
    p_description text,
    p_amount integer
)
RETURNS SETOF achievement_unlock_result
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_current_xp integer;
    v_current_streak integer;
    v_last_active date;
    v_today date := current_date;
    v_yesterday date := current_date - interval '1 day';
    v_activities_count integer;
    -- Variables for achievement loop
    v_achievement record;
    v_cond_type text;
    v_cond_threshold integer;
    v_earned boolean;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Log activity
    INSERT INTO activity_log (user_id, type, title, description, xp_earned)
    VALUES (v_user_id, p_type, p_title, p_description, p_amount);

    -- 2. Fetch current profile stats with row lock
    SELECT xp, streak_days, last_active_at::date
    INTO v_current_xp, v_current_streak, v_last_active
    FROM profiles
    WHERE id = v_user_id
    FOR UPDATE;

    -- 3. Streak Logic
    IF v_last_active IS DISTINCT FROM v_today THEN
        IF v_last_active = v_yesterday THEN
            v_current_streak := v_current_streak + 1;
        ELSE
            v_current_streak := 1;
        END IF;
    END IF;

    -- Update Profile
    v_current_xp := COALESCE(v_current_xp, 0) + p_amount;
    UPDATE profiles
    SET
        xp = v_current_xp,
        streak_days = v_current_streak,
        last_active_at = now()
    WHERE id = v_user_id;

    -- 4. Check for Achievements
    -- Get total activities count for achievement conditions
    SELECT count(*) INTO v_activities_count FROM activity_log WHERE user_id = v_user_id;

    FOR v_achievement IN
        SELECT id, condition
        FROM achievements
        WHERE id NOT IN (SELECT achievement_id FROM user_achievements WHERE user_id = v_user_id)
    LOOP
        v_cond_type := v_achievement.condition->>'type';
        v_cond_threshold := (v_achievement.condition->>'threshold')::integer;
        v_earned := false;

        IF v_cond_type = 'xp' THEN
            v_earned := v_current_xp >= v_cond_threshold;
        ELSIF v_cond_type = 'streak' THEN
            v_earned := v_current_streak >= v_cond_threshold;
        ELSIF v_cond_type = 'activities' THEN
            v_earned := v_activities_count >= v_cond_threshold;
        END IF;

        IF v_earned THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            VALUES (v_user_id, v_achievement.id)
            ON CONFLICT DO NOTHING;
            -- Yield unlocked ID
            RETURN QUERY SELECT v_achievement.id;
        END IF;
    END LOOP;

    RETURN;
END;
$$;
