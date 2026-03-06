-- ============================================================
-- 036: Comments System — columns, triggers, RLS, feed functions
-- ============================================================

-- 1a. Add columns to meals table
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS comments_muted BOOLEAN NOT NULL DEFAULT FALSE;

-- 1b. Add visible column to comments table
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS visible BOOLEAN NOT NULL DEFAULT TRUE;

-- 1c. Backfill comment_count from existing comments
UPDATE public.meals m
SET comment_count = sub.cnt
FROM (
  SELECT meal_id, COUNT(*)::INTEGER AS cnt
  FROM public.comments
  WHERE visible = TRUE
  GROUP BY meal_id
) sub
WHERE m.id = sub.meal_id;

-- 1d. Trigger function to maintain comment_count
CREATE OR REPLACE FUNCTION public.update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.visible = TRUE THEN
      UPDATE public.meals SET comment_count = comment_count + 1 WHERE id = NEW.meal_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.visible = TRUE THEN
      UPDATE public.meals SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.meal_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.visible = TRUE AND NEW.visible = FALSE THEN
      UPDATE public.meals SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = NEW.meal_id;
    ELSIF OLD.visible = FALSE AND NEW.visible = TRUE THEN
      UPDATE public.meals SET comment_count = comment_count + 1 WHERE id = NEW.meal_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1e. Create trigger
DROP TRIGGER IF EXISTS trigger_update_comment_count ON public.comments;
CREATE TRIGGER trigger_update_comment_count
  AFTER INSERT OR DELETE OR UPDATE OF visible ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comment_count();

-- 1f. Partial index for visible comments (ASC for conversation order)
CREATE INDEX IF NOT EXISTS idx_comments_visible
  ON public.comments(meal_id, created_at ASC)
  WHERE visible = TRUE;

-- 2a. Add reported_comment_id to reports table
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS reported_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- 2b. Update check constraint to include comment reports
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_check
  CHECK (
    reported_meal_id IS NOT NULL
    OR reported_user_id IS NOT NULL
    OR reported_comment_id IS NOT NULL
  );

-- 2c. Index for comment reports
CREATE INDEX IF NOT EXISTS idx_reports_comment
  ON public.reports(reported_comment_id)
  WHERE reported_comment_id IS NOT NULL;

-- 3. Update RLS policies on comments

-- Drop existing policies
DROP POLICY IF EXISTS "Comments are publicly readable" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can comment" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;

-- SELECT: visible comments on public meals readable by all;
-- visible comments on private meals readable by meal author + accepted private feed list members
CREATE POLICY "Comments follow meal visibility" ON public.comments
  FOR SELECT
  USING (
    visible = TRUE
    AND EXISTS (
      SELECT 1 FROM public.meals m
      WHERE m.id = meal_id
      AND (
        m.visibility = 'public'
        OR m.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.private_feed_lists pfl
          WHERE pfl.owner_id = m.user_id
            AND pfl.member_id = auth.uid()
            AND pfl.status = 'accepted'
        )
      )
    )
  );

-- INSERT: authenticated users can comment on meals they have access to
CREATE POLICY "Users can comment on accessible meals" ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.meals m
      WHERE m.id = meal_id
      AND (
        m.visibility = 'public'
        OR m.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.private_feed_lists pfl
          WHERE pfl.owner_id = m.user_id
            AND pfl.member_id = auth.uid()
            AND pfl.status = 'accepted'
        )
      )
    )
  );

-- DELETE: own comments only (admin uses service role to bypass RLS)
CREATE POLICY "Users can delete own comments" ON public.comments
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Update get_feed function to use denormalized comment_count and add comments_enabled
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
    m.image_count
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

-- 5. Update get_following_feed function similarly
DROP FUNCTION IF EXISTS public.get_following_feed(INTEGER, TIMESTAMPTZ);

CREATE FUNCTION public.get_following_feed(
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
    m.image_count
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
