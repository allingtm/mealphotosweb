-- ============================================================
-- Migration 031: Public Profiles
-- Adds privacy columns, follow counts, public_profiles view rebuild,
-- profile stats function, self-follow prevention, and feed privacy
-- ============================================================

-- 1. Add privacy and count columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN show_location BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN show_streak BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN follower_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN following_count INTEGER NOT NULL DEFAULT 0;

-- 2. Backfill follower/following counts from existing follows data
UPDATE public.profiles p
SET follower_count = (SELECT COUNT(*) FROM public.follows WHERE following_id = p.id);

UPDATE public.profiles p
SET following_count = (SELECT COUNT(*) FROM public.follows WHERE follower_id = p.id);

-- 3. Create trigger function to maintain follow counts
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.following_id;
    UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trigger_update_follow_counts
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_follow_counts();

-- 4. Rebuild public_profiles view with privacy flags and new columns
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT
  id,
  username,
  display_name,
  bio,
  avatar_url,
  CASE WHEN show_location THEN location_city ELSE NULL END AS location_city,
  CASE WHEN show_location THEN location_country ELSE NULL END AS location_country,
  CASE WHEN show_streak THEN streak_current ELSE NULL END AS streak_current,
  streak_best,
  is_restaurant,
  subscription_status,
  follower_count,
  following_count,
  show_location,
  show_streak,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 5. Create get_profile_stats function
DROP FUNCTION IF EXISTS public.get_profile_stats(UUID);

CREATE FUNCTION public.get_profile_stats(profile_id UUID)
RETURNS TABLE (
  meal_count BIGINT,
  avg_rating NUMERIC,
  ratings_given_count BIGINT
) AS $$
  SELECT
    (SELECT COUNT(*)
     FROM public.meals m
     JOIN public.meal_moderation mm ON mm.meal_id = m.id AND mm.status = 'approved'
     WHERE m.user_id = profile_id) AS meal_count,
    (SELECT ROUND(AVG(m.avg_rating), 1)
     FROM public.meals m
     JOIN public.meal_moderation mm ON mm.meal_id = m.id AND mm.status = 'approved'
     WHERE m.user_id = profile_id AND m.rating_count > 0) AS avg_rating,
    (SELECT COUNT(*) FROM public.ratings WHERE user_id = profile_id) AS ratings_given_count;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';

-- 6. Prevent self-follow
ALTER TABLE public.follows
  ADD CONSTRAINT follows_no_self_follow CHECK (follower_id != following_id);

-- 7. Update get_feed to respect show_location privacy
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
  venue_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.user_id, m.title, m.photo_url, m.photo_blur_hash,
    CASE WHEN p.show_location THEN m.location_city ELSE NULL END AS location_city,
    m.avg_rating, m.rating_count,
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
    END AS venue_verified
  FROM public.meals m
  JOIN public.profiles p ON m.user_id = p.id
  JOIN public.meal_moderation mm ON mm.meal_id = m.id AND mm.status = 'approved'
  LEFT JOIN public.ratings r ON r.meal_id = m.id AND r.user_id = auth.uid()
  LEFT JOIN public.blocked_users b ON b.blocker_id = auth.uid() AND b.blocked_id = m.user_id
  LEFT JOIN public.restaurant_claims rc ON rc.venue_mapbox_id = m.venue_mapbox_id
  LEFT JOIN public.profiles rp ON rp.id = rc.claimed_by
  WHERE (m.is_restaurant_meal = FALSE OR m.restaurant_revealed = TRUE)
    AND b.blocker_id IS NULL
    AND m.created_at > now() - INTERVAL '7 days'
    AND (p_cursor IS NULL OR m.created_at < p_cursor)
  ORDER BY feed_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
