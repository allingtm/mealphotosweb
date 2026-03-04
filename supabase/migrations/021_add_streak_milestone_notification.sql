-- Update streak trigger to also create milestone notifications at 7, 30, 100, 365 days
CREATE OR REPLACE FUNCTION public.update_streak_on_meal_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_user_tz TEXT;
  v_today DATE;
  v_last_upload DATE;
  v_current_streak INTEGER;
  v_best_streak INTEGER;
  v_milestones INTEGER[] := ARRAY[7, 30, 100, 365];
  v_milestone INTEGER;
BEGIN
  SELECT timezone, streak_last_upload, streak_current, streak_best
  INTO v_user_tz, v_last_upload, v_current_streak, v_best_streak
  FROM public.profiles
  WHERE id = NEW.user_id;

  v_user_tz := COALESCE(v_user_tz, 'UTC');
  v_today := (now() AT TIME ZONE v_user_tz)::DATE;

  IF v_last_upload IS NOT NULL AND v_last_upload = v_today THEN
    RETURN NEW;
  ELSIF v_last_upload IS NOT NULL AND v_last_upload = v_today - 1 THEN
    v_current_streak := COALESCE(v_current_streak, 0) + 1;
    IF v_current_streak > COALESCE(v_best_streak, 0) THEN
      v_best_streak := v_current_streak;
    END IF;
  ELSE
    v_current_streak := 1;
    IF COALESCE(v_best_streak, 0) < 1 THEN
      v_best_streak := 1;
    END IF;
  END IF;

  UPDATE public.profiles
  SET streak_current = v_current_streak,
      streak_best = v_best_streak,
      streak_last_upload = v_today
  WHERE id = NEW.user_id;

  -- Check for streak milestones and create notifications
  FOREACH v_milestone IN ARRAY v_milestones LOOP
    IF v_current_streak = v_milestone THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        NEW.user_id,
        'streak_milestone',
        v_milestone || '-day streak! Amazing!',
        'You''ve uploaded meals for ' || v_milestone || ' days in a row. Keep it going!',
        jsonb_build_object('streak_days', v_milestone)
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
