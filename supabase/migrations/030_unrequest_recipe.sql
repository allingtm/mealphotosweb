-- 1. DELETE RLS policy on recipe_requests
CREATE POLICY "Users can delete own requests"
  ON public.recipe_requests
  FOR DELETE
  USING (auth.uid() = user_id);

-- 2. New unrequest_recipe() function
CREATE OR REPLACE FUNCTION public.unrequest_recipe(p_meal_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_new_count INTEGER;
  v_threshold INTEGER;
  v_unlocked BOOLEAN;
  v_user_id UUID;
  v_deleted INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Delete the request row
  DELETE FROM public.recipe_requests
  WHERE meal_id = p_meal_id AND user_id = v_user_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'No existing request found';
  END IF;

  -- Decrement count (floor at 0)
  UPDATE public.meals
  SET recipe_request_count = GREATEST(recipe_request_count - 1, 0),
      updated_at = now()
  WHERE id = p_meal_id
  RETURNING recipe_request_count, recipe_unlock_threshold, recipe_unlocked
  INTO v_new_count, v_threshold, v_unlocked;

  RETURN jsonb_build_object(
    'request_count', v_new_count,
    'threshold', v_threshold,
    'unlocked', v_unlocked
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3. Update get_feed to include user_has_requested
DROP FUNCTION IF EXISTS public.get_feed(INTEGER, TIMESTAMPTZ);

CREATE FUNCTION public.get_feed(
  p_limit INTEGER DEFAULT 20,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID, user_id UUID, title TEXT, photo_url TEXT, photo_blur_hash TEXT,
  location_city TEXT, avg_rating NUMERIC, rating_count INTEGER,
  recipe_request_count INTEGER, recipe_unlock_threshold INTEGER, recipe_unlocked BOOLEAN,
  created_at TIMESTAMPTZ, username TEXT, display_name TEXT, avatar_url TEXT,
  user_has_rated BOOLEAN, user_rating SMALLINT,
  feed_score DOUBLE PRECISION, comment_count BIGINT,
  venue_name TEXT, venue_mapbox_id TEXT,
  venue_verified BOOLEAN,
  user_has_requested BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.user_id, m.title, m.photo_url, m.photo_blur_hash,
    m.location_city, m.avg_rating, m.rating_count,
    m.recipe_request_count, m.recipe_unlock_threshold, m.recipe_unlocked,
    m.created_at, p.username, p.display_name, p.avatar_url,
    CASE WHEN r.id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_rated,
    r.score AS user_rating,
    (m.rating_count::DOUBLE PRECISION * COALESCE(m.avg_rating, 0)::DOUBLE PRECISION)
      / (EXTRACT(EPOCH FROM (now() - m.created_at)) / 3600 + 1) AS feed_score,
    (SELECT COUNT(*) FROM public.comments c WHERE c.meal_id = m.id) AS comment_count,
    m.venue_name, m.venue_mapbox_id,
    CASE
      WHEN rc.id IS NOT NULL
        AND rp.subscription_status = 'active'
        AND rp.is_restaurant = TRUE
      THEN TRUE
      ELSE FALSE
    END AS venue_verified,
    CASE WHEN rr.id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_requested
  FROM public.meals m
  JOIN public.profiles p ON m.user_id = p.id
  JOIN public.meal_moderation mm ON mm.meal_id = m.id AND mm.status = 'approved'
  LEFT JOIN public.ratings r ON r.meal_id = m.id AND r.user_id = auth.uid()
  LEFT JOIN public.blocked_users b ON b.blocker_id = auth.uid() AND b.blocked_id = m.user_id
  LEFT JOIN public.restaurant_claims rc ON rc.venue_mapbox_id = m.venue_mapbox_id
  LEFT JOIN public.profiles rp ON rp.id = rc.claimed_by
  LEFT JOIN public.recipe_requests rr ON rr.meal_id = m.id AND rr.user_id = auth.uid()
  WHERE (m.is_restaurant_meal = FALSE OR m.restaurant_revealed = TRUE)
    AND b.blocker_id IS NULL
    AND m.created_at > now() - INTERVAL '7 days'
    AND (p_cursor IS NULL OR m.created_at < p_cursor)
  ORDER BY feed_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
