-- Update rating milestone trigger to also send push notification via pg_net
CREATE OR REPLACE FUNCTION public.notify_rating_milestone()
RETURNS TRIGGER AS $$
DECLARE
  v_old_threshold NUMERIC;
  v_new_threshold NUMERIC;
  v_meal_title TEXT;
  v_project_url TEXT;
  v_service_key TEXT;
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

    BEGIN
      SELECT decrypted_secret INTO v_project_url FROM vault.decrypted_secrets WHERE name = 'project_url';
      SELECT decrypted_secret INTO v_service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';

      IF v_project_url IS NOT NULL AND v_service_key IS NOT NULL THEN
        PERFORM extensions.http_post(
          url := v_project_url || '/functions/v1/send-push-notification',
          body := jsonb_build_object(
            'user_id', NEW.user_id,
            'title', 'Rating milestone!',
            'body', 'Your ' || COALESCE(v_meal_title, 'meal') || ' just hit ' || NEW.avg_rating || '!',
            'url', 'https://meal.photos/meal/' || NEW.id
          ),
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_key
          )
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Update recipe unlocked trigger to also send push notification
CREATE OR REPLACE FUNCTION public.notify_recipe_unlocked()
RETURNS TRIGGER AS $$
DECLARE
  v_meal_title TEXT;
  v_project_url TEXT;
  v_service_key TEXT;
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

  BEGIN
    SELECT decrypted_secret INTO v_project_url FROM vault.decrypted_secrets WHERE name = 'project_url';
    SELECT decrypted_secret INTO v_service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';

    IF v_project_url IS NOT NULL AND v_service_key IS NOT NULL THEN
      PERFORM extensions.http_post(
        url := v_project_url || '/functions/v1/send-push-notification',
        body := jsonb_build_object(
          'user_id', NEW.user_id,
          'title', 'Recipe Unlocked!',
          'body', NEW.recipe_unlock_threshold || ' people want your recipe! Add it now.',
          'url', 'https://meal.photos/meal/' || NEW.id
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
