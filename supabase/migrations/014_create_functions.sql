-- Feed algorithm function
CREATE OR REPLACE FUNCTION public.get_feed(
  p_limit INTEGER DEFAULT 20,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID, user_id UUID, title TEXT, photo_url TEXT, photo_blur_hash TEXT,
  location_city TEXT, avg_rating NUMERIC, rating_count INTEGER,
  recipe_request_count INTEGER, recipe_unlocked BOOLEAN,
  created_at TIMESTAMPTZ, username TEXT, display_name TEXT, avatar_url TEXT,
  user_has_rated BOOLEAN, user_rating SMALLINT,
  feed_score DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.user_id, m.title, m.photo_url, m.photo_blur_hash,
    m.location_city, m.avg_rating, m.rating_count,
    m.recipe_request_count, m.recipe_unlocked,
    m.created_at, p.username, p.display_name, p.avatar_url,
    CASE WHEN r.id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_rated,
    r.score AS user_rating,
    (m.rating_count::DOUBLE PRECISION * COALESCE(m.avg_rating, 0)::DOUBLE PRECISION)
      / (EXTRACT(EPOCH FROM (now() - m.created_at)) / 3600 + 1) AS feed_score
  FROM public.meals m
  JOIN public.profiles p ON m.user_id = p.id
  JOIN public.meal_moderation mm ON mm.meal_id = m.id AND mm.status = 'approved'
  LEFT JOIN public.ratings r ON r.meal_id = m.id AND r.user_id = auth.uid()
  LEFT JOIN public.blocked_users b ON b.blocker_id = auth.uid() AND b.blocked_id = m.user_id
  WHERE (m.is_restaurant_meal = FALSE OR m.restaurant_revealed = TRUE)
    AND b.blocker_id IS NULL
    AND m.created_at > now() - INTERVAL '7 days'
    AND (p_cursor IS NULL OR m.created_at < p_cursor)
  ORDER BY feed_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Rating submission function (atomic update)
CREATE OR REPLACE FUNCTION public.rate_meal(
  p_meal_id UUID,
  p_score SMALLINT
)
RETURNS JSONB AS $$
DECLARE
  v_new_avg NUMERIC(3,1);
  v_new_count INTEGER;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Prevent users from rating their own meals
  IF EXISTS (SELECT 1 FROM public.meals WHERE id = p_meal_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Cannot rate your own meal';
  END IF;

  -- Insert rating (will fail on duplicate due to unique constraint)
  INSERT INTO public.ratings (meal_id, user_id, score)
  VALUES (p_meal_id, v_user_id, p_score);

  -- Atomic update of meal aggregates
  UPDATE public.meals
  SET
    rating_count = rating_count + 1,
    rating_sum = rating_sum + p_score,
    avg_rating = ROUND((rating_sum + p_score)::NUMERIC / (rating_count + 1), 1),
    updated_at = now()
  WHERE id = p_meal_id
  RETURNING avg_rating, rating_count INTO v_new_avg, v_new_count;

  RETURN jsonb_build_object(
    'avg_rating', v_new_avg,
    'rating_count', v_new_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Recipe request function
CREATE OR REPLACE FUNCTION public.request_recipe(
  p_meal_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_new_count INTEGER;
  v_threshold INTEGER;
  v_unlocked BOOLEAN;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.recipe_requests (meal_id, user_id)
  VALUES (p_meal_id, v_user_id);

  UPDATE public.meals
  SET recipe_request_count = recipe_request_count + 1,
      updated_at = now()
  WHERE id = p_meal_id
  RETURNING recipe_request_count, recipe_unlock_threshold, recipe_unlocked
  INTO v_new_count, v_threshold, v_unlocked;

  -- Check if threshold reached
  IF v_new_count >= v_threshold AND NOT v_unlocked THEN
    UPDATE public.meals SET recipe_unlocked = TRUE WHERE id = p_meal_id;
    v_unlocked := TRUE;
  END IF;

  RETURN jsonb_build_object(
    'request_count', v_new_count,
    'threshold', v_threshold,
    'unlocked', v_unlocked
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Map pins function
CREATE OR REPLACE FUNCTION public.get_map_pins(
  p_min_lng DOUBLE PRECISION,
  p_min_lat DOUBLE PRECISION,
  p_max_lng DOUBLE PRECISION,
  p_max_lat DOUBLE PRECISION,
  p_limit INTEGER DEFAULT 200
)
RETURNS TABLE (
  id UUID, title TEXT, photo_url TEXT,
  avg_rating NUMERIC, rating_count INTEGER,
  lng DOUBLE PRECISION, lat DOUBLE PRECISION,
  is_restaurant BOOLEAN, username TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.title, m.photo_url,
    m.avg_rating, m.rating_count,
    ST_X(m.location::geometry) AS lng,
    ST_Y(m.location::geometry) AS lat,
    m.is_restaurant_meal AND m.restaurant_revealed AS is_restaurant,
    p.username
  FROM public.meals m
  JOIN public.profiles p ON m.user_id = p.id
  WHERE m.location IS NOT NULL
    AND ST_Intersects(
      m.location,
      ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)
    )
    AND (m.is_restaurant_meal = FALSE OR m.restaurant_revealed = TRUE)
  ORDER BY m.avg_rating DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
