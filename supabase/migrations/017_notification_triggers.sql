-- =============================================================
-- Trigger: Rating milestone notifications
-- Fires when avg_rating crosses a 0.5 threshold (7.0, 7.5, 8.0, etc.)
-- =============================================================
CREATE OR REPLACE FUNCTION public.notify_rating_milestone()
RETURNS TRIGGER AS $$
DECLARE
  v_old_threshold NUMERIC;
  v_new_threshold NUMERIC;
  v_meal_title TEXT;
BEGIN
  IF OLD.avg_rating IS NOT DISTINCT FROM NEW.avg_rating THEN
    RETURN NEW;
  END IF;

  v_old_threshold := FLOOR(OLD.avg_rating * 2) / 2.0;
  v_new_threshold := FLOOR(NEW.avg_rating * 2) / 2.0;

  IF v_new_threshold > v_old_threshold AND NEW.avg_rating >= 7.0 THEN
    SELECT title INTO v_meal_title FROM public.meals WHERE id = NEW.id;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'rating_milestone',
      'Your ' || COALESCE(v_meal_title, 'meal') || ' just hit ' || NEW.avg_rating || '!',
      'Keep it up — your meal is climbing the ratings.',
      jsonb_build_object('meal_id', NEW.id, 'avg_rating', NEW.avg_rating)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_rating_milestone
  AFTER UPDATE OF avg_rating ON public.meals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_rating_milestone();

-- =============================================================
-- Trigger: Recipe near-unlock notification (85% of threshold)
-- =============================================================
CREATE OR REPLACE FUNCTION public.notify_recipe_near_unlock()
RETURNS TRIGGER AS $$
DECLARE
  v_threshold_85 INTEGER;
  v_meal_title TEXT;
  v_remaining INTEGER;
BEGIN
  IF OLD.recipe_request_count IS NOT DISTINCT FROM NEW.recipe_request_count THEN
    RETURN NEW;
  END IF;

  IF NEW.recipe_unlocked THEN
    RETURN NEW;
  END IF;

  v_threshold_85 := CEIL(NEW.recipe_unlock_threshold * 0.85);

  IF NEW.recipe_request_count >= v_threshold_85 AND OLD.recipe_request_count < v_threshold_85 THEN
    v_remaining := NEW.recipe_unlock_threshold - NEW.recipe_request_count;

    SELECT title INTO v_meal_title FROM public.meals WHERE id = NEW.id;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'recipe_near_unlock',
      v_remaining || ' more requests to unlock your recipe!',
      'Your ' || COALESCE(v_meal_title, 'meal') || ' is almost there.',
      jsonb_build_object('meal_id', NEW.id, 'request_count', NEW.recipe_request_count, 'threshold', NEW.recipe_unlock_threshold)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_recipe_near_unlock
  AFTER UPDATE OF recipe_request_count ON public.meals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_recipe_near_unlock();

-- =============================================================
-- Trigger: Recipe unlocked notification
-- =============================================================
CREATE OR REPLACE FUNCTION public.notify_recipe_unlocked()
RETURNS TRIGGER AS $$
DECLARE
  v_meal_title TEXT;
BEGIN
  IF OLD.recipe_unlocked = TRUE OR NEW.recipe_unlocked = FALSE THEN
    RETURN NEW;
  END IF;

  SELECT title INTO v_meal_title FROM public.meals WHERE id = NEW.id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.user_id,
    'recipe_unlocked',
    NEW.recipe_unlock_threshold || ' people want your recipe! Add it now.',
    'Your ' || COALESCE(v_meal_title, 'meal') || ' recipe has been unlocked.',
    jsonb_build_object('meal_id', NEW.id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_recipe_unlocked
  AFTER UPDATE OF recipe_unlocked ON public.meals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_recipe_unlocked();

-- =============================================================
-- Trigger: New follower notification
-- =============================================================
CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS TRIGGER AS $$
DECLARE
  v_follower_username TEXT;
BEGIN
  SELECT username INTO v_follower_username
  FROM public.profiles WHERE id = NEW.follower_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.following_id,
    'new_follower',
    '@' || COALESCE(v_follower_username, 'someone') || ' started following you',
    NULL,
    jsonb_build_object('follower_id', NEW.follower_id, 'follower_username', v_follower_username)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_new_follower
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_follower();

-- =============================================================
-- Trigger: Streak update on meal insert
-- =============================================================
CREATE OR REPLACE FUNCTION public.update_streak_on_meal_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_user_tz TEXT;
  v_today DATE;
  v_last_upload DATE;
  v_current_streak INTEGER;
  v_best_streak INTEGER;
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_streak_on_meal_insert
  AFTER INSERT ON public.meals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_streak_on_meal_insert();
