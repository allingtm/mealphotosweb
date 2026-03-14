-- 038: Journal feed + fix visibility leak in public feeds
-- Bug: get_feed(), get_following_feed(), check_new_following_meals(), get_map_pins()
-- all lack visibility = 'public' filter, leaking private meals into public feeds.
-- Feature: New get_journal_feed() for the Journal tab (user's own private meals).

-- 1. Fix get_feed() — add visibility = 'public' filter
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
  user_is_following BOOLEAN,
  comments_enabled BOOLEAN,
  visibility TEXT,
  image_count INTEGER
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
    m.comment_count::BIGINT AS comment_count,
    m.venue_name, m.venue_mapbox_id,
    CASE
      WHEN rc.id IS NOT NULL
        AND rp.subscription_status = 'active'
        AND rp.is_restaurant = TRUE
      THEN TRUE
      ELSE FALSE
    END AS venue_verified,
    CASE WHEN rr.id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_requested,
    CASE WHEN f.follower_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_is_following,
    m.comments_enabled,
    m.visibility,
    m.image_count::INTEGER
  FROM public.meals m
  JOIN public.profiles p ON m.user_id = p.id
  JOIN public.meal_moderation mm ON mm.meal_id = m.id AND mm.status = 'approved'
  LEFT JOIN public.ratings r ON r.meal_id = m.id AND r.user_id = auth.uid()
  LEFT JOIN public.blocked_users b ON b.blocker_id = auth.uid() AND b.blocked_id = m.user_id
  LEFT JOIN public.restaurant_claims rc ON rc.venue_mapbox_id = m.venue_mapbox_id
  LEFT JOIN public.profiles rp ON rp.id = rc.claimed_by
  LEFT JOIN public.recipe_requests rr ON rr.meal_id = m.id AND rr.user_id = auth.uid()
  LEFT JOIN public.follows f ON f.follower_id = auth.uid() AND f.following_id = m.user_id
  WHERE m.visibility = 'public'
    AND (m.is_restaurant_meal = FALSE OR m.restaurant_revealed = TRUE)
    AND b.blocker_id IS NULL
    AND m.created_at > now() - INTERVAL '7 days'
    AND (p_cursor IS NULL OR m.created_at < p_cursor)
  ORDER BY feed_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 2. Fix get_following_feed() — add visibility = 'public' filter
DROP FUNCTION IF EXISTS public.get_following_feed(INTEGER, TIMESTAMPTZ);

CREATE FUNCTION public.get_following_feed(
  p_limit INTEGER DEFAULT 20,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID, user_id UUID, title TEXT, photo_url TEXT, photo_blur_hash TEXT,
  location_city TEXT, avg_rating NUMERIC, rating_count INTEGER,
  recipe_request_count INTEGER, recipe_unlock_threshold INTEGER, recipe_unlocked BOOLEAN,
  created_at TIMESTAMPTZ, username TEXT, display_name TEXT, avatar_url TEXT,
  user_has_rated BOOLEAN, user_rating SMALLINT,
  comment_count BIGINT,
  venue_name TEXT, venue_mapbox_id TEXT,
  venue_verified BOOLEAN,
  user_has_requested BOOLEAN,
  comments_enabled BOOLEAN,
  visibility TEXT,
  image_count INTEGER
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
    m.comment_count::BIGINT AS comment_count,
    m.venue_name, m.venue_mapbox_id,
    CASE
      WHEN rc.id IS NOT NULL
        AND rp.subscription_status = 'active'
        AND rp.is_restaurant = TRUE
      THEN TRUE
      ELSE FALSE
    END AS venue_verified,
    CASE WHEN rr.id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_requested,
    m.comments_enabled,
    m.visibility,
    m.image_count::INTEGER
  FROM public.meals m
  JOIN public.profiles p ON m.user_id = p.id
  JOIN public.meal_moderation mm ON mm.meal_id = m.id AND mm.status = 'approved'
  JOIN public.follows fw ON fw.following_id = m.user_id AND fw.follower_id = auth.uid()
  LEFT JOIN public.ratings r ON r.meal_id = m.id AND r.user_id = auth.uid()
  LEFT JOIN public.blocked_users b ON b.blocker_id = auth.uid() AND b.blocked_id = m.user_id
  LEFT JOIN public.restaurant_claims rc ON rc.venue_mapbox_id = m.venue_mapbox_id
  LEFT JOIN public.profiles rp ON rp.id = rc.claimed_by
  LEFT JOIN public.recipe_requests rr ON rr.meal_id = m.id AND rr.user_id = auth.uid()
  WHERE m.visibility = 'public'
    AND (m.is_restaurant_meal = FALSE OR m.restaurant_revealed = TRUE)
    AND b.blocker_id IS NULL
    AND (p_cursor IS NULL OR m.created_at < p_cursor)
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3. Fix check_new_following_meals() — add visibility = 'public' filter
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
    AND m.visibility = 'public'
    AND (m.is_restaurant_meal = FALSE OR m.restaurant_revealed = TRUE)
    AND b.blocker_id IS NULL;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 4. Fix get_map_pins() — add visibility = 'public' filter
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
    AND m.visibility = 'public'
    AND ST_Intersects(
      m.location,
      ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)
    )
    AND (m.is_restaurant_meal = FALSE OR m.restaurant_revealed = TRUE)
  ORDER BY m.avg_rating DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 5. Create get_journal_feed() — user's own private meals
CREATE FUNCTION public.get_journal_feed(
  p_limit INTEGER DEFAULT 20,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID, user_id UUID, title TEXT, photo_url TEXT, photo_blur_hash TEXT,
  location_city TEXT, avg_rating NUMERIC, rating_count INTEGER,
  recipe_request_count INTEGER, recipe_unlock_threshold INTEGER, recipe_unlocked BOOLEAN,
  created_at TIMESTAMPTZ, username TEXT, display_name TEXT, avatar_url TEXT,
  user_has_rated BOOLEAN, user_rating SMALLINT,
  comment_count BIGINT,
  venue_name TEXT, venue_mapbox_id TEXT,
  venue_verified BOOLEAN,
  user_has_requested BOOLEAN,
  comments_enabled BOOLEAN,
  visibility TEXT,
  image_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.user_id, m.title, m.photo_url, m.photo_blur_hash,
    m.location_city, m.avg_rating, m.rating_count,
    m.recipe_request_count, m.recipe_unlock_threshold, m.recipe_unlocked,
    m.created_at, p.username, p.display_name, p.avatar_url,
    FALSE AS user_has_rated,
    NULL::SMALLINT AS user_rating,
    m.comment_count::BIGINT AS comment_count,
    m.venue_name, m.venue_mapbox_id,
    CASE
      WHEN rc.id IS NOT NULL
        AND rp.subscription_status = 'active'
        AND rp.is_restaurant = TRUE
      THEN TRUE
      ELSE FALSE
    END AS venue_verified,
    FALSE AS user_has_requested,
    m.comments_enabled,
    m.visibility,
    m.image_count::INTEGER
  FROM public.meals m
  JOIN public.profiles p ON m.user_id = p.id
  JOIN public.meal_moderation mm ON mm.meal_id = m.id AND mm.status = 'approved'
  LEFT JOIN public.restaurant_claims rc ON rc.venue_mapbox_id = m.venue_mapbox_id
  LEFT JOIN public.profiles rp ON rp.id = rc.claimed_by
  WHERE m.user_id = auth.uid()
    AND m.visibility = 'private'
    AND (p_cursor IS NULL OR m.created_at < p_cursor)
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
