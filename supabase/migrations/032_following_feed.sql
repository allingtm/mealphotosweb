-- 1. Add notify_on_upload column to follows table
ALTER TABLE public.follows ADD COLUMN IF NOT EXISTS notify_on_upload BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Create get_following_feed function
CREATE OR REPLACE FUNCTION public.get_following_feed(
  p_limit INTEGER DEFAULT 20,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  photo_url TEXT,
  photo_blur_hash TEXT,
  location_city TEXT,
  avg_rating NUMERIC,
  rating_count INTEGER,
  recipe_request_count INTEGER,
  recipe_unlock_threshold INTEGER,
  recipe_unlocked BOOLEAN,
  created_at TIMESTAMPTZ,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  user_has_rated BOOLEAN,
  user_rating SMALLINT,
  comment_count BIGINT,
  venue_name TEXT,
  venue_mapbox_id TEXT,
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
  JOIN public.follows fw ON fw.following_id = m.user_id AND fw.follower_id = auth.uid()
  LEFT JOIN public.ratings r ON r.meal_id = m.id AND r.user_id = auth.uid()
  LEFT JOIN public.blocked_users b ON b.blocker_id = auth.uid() AND b.blocked_id = m.user_id
  LEFT JOIN public.restaurant_claims rc ON rc.venue_mapbox_id = m.venue_mapbox_id
  LEFT JOIN public.profiles rp ON rp.id = rc.claimed_by
  LEFT JOIN public.recipe_requests rr ON rr.meal_id = m.id AND rr.user_id = auth.uid()
  WHERE (m.is_restaurant_meal = FALSE OR m.restaurant_revealed = TRUE)
    AND b.blocker_id IS NULL
    AND (p_cursor IS NULL OR m.created_at < p_cursor)
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3. Update get_feed to include user_is_following
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
  user_has_requested BOOLEAN,
  user_is_following BOOLEAN
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
    CASE WHEN rr.id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_requested,
    CASE WHEN f.follower_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_is_following
  FROM public.meals m
  JOIN public.profiles p ON m.user_id = p.id
  JOIN public.meal_moderation mm ON mm.meal_id = m.id AND mm.status = 'approved'
  LEFT JOIN public.ratings r ON r.meal_id = m.id AND r.user_id = auth.uid()
  LEFT JOIN public.blocked_users b ON b.blocker_id = auth.uid() AND b.blocked_id = m.user_id
  LEFT JOIN public.restaurant_claims rc ON rc.venue_mapbox_id = m.venue_mapbox_id
  LEFT JOIN public.profiles rp ON rp.id = rc.claimed_by
  LEFT JOIN public.recipe_requests rr ON rr.meal_id = m.id AND rr.user_id = auth.uid()
  LEFT JOIN public.follows f ON f.follower_id = auth.uid() AND f.following_id = m.user_id
  WHERE (m.is_restaurant_meal = FALSE OR m.restaurant_revealed = TRUE)
    AND b.blocker_id IS NULL
    AND m.created_at > now() - INTERVAL '7 days'
    AND (p_cursor IS NULL OR m.created_at < p_cursor)
  ORDER BY feed_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 4. Create get_follow_suggestions function
CREATE OR REPLACE FUNCTION public.get_follow_suggestions(
  p_city TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  meal_count BIGINT,
  avg_rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    COUNT(m.id) AS meal_count,
    ROUND(AVG(m.avg_rating) FILTER (WHERE m.rating_count > 0), 1) AS avg_rating
  FROM public.profiles p
  JOIN public.meals m ON m.user_id = p.id
  JOIN public.meal_moderation mm ON mm.meal_id = m.id AND mm.status = 'approved'
  LEFT JOIN public.follows f ON f.following_id = p.id AND f.follower_id = auth.uid()
  WHERE p.id != auth.uid()
    AND p.is_restaurant = FALSE
    AND f.follower_id IS NULL
    AND (p_city IS NULL OR p.location_city = p_city)
  GROUP BY p.id, p.username, p.display_name, p.avatar_url, p.location_city
  HAVING COUNT(m.id) >= 3
  ORDER BY
    CASE WHEN p_city IS NOT NULL AND p.location_city = p_city THEN 0 ELSE 1 END,
    ROUND(AVG(m.avg_rating) FILTER (WHERE m.rating_count > 0), 1) DESC NULLS LAST,
    COUNT(m.id) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 5. Create check_new_following_meals function
CREATE OR REPLACE FUNCTION public.check_new_following_meals(p_since TIMESTAMPTZ)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.meals m
  JOIN public.follows fw ON fw.following_id = m.user_id AND fw.follower_id = auth.uid()
  JOIN public.meal_moderation mm ON mm.meal_id = m.id AND mm.status = 'approved'
  LEFT JOIN public.blocked_users b ON b.blocker_id = auth.uid() AND b.blocked_id = m.user_id
  WHERE m.created_at > p_since
    AND (m.is_restaurant_meal = FALSE OR m.restaurant_revealed = TRUE)
    AND b.blocker_id IS NULL;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
