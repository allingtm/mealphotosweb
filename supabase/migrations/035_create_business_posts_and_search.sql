-- =============================================
-- business_posts table
-- =============================================
CREATE TABLE public.business_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT CHECK (char_length(title) <= 120),
  body TEXT CHECK (char_length(body) <= 1000),
  image_url TEXT,
  cloudflare_image_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_business_posts_user ON public.business_posts(user_id, created_at DESC);

ALTER TABLE public.business_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY bp_posts_public_read ON public.business_posts
  FOR SELECT USING (true);

CREATE POLICY bp_posts_owner_write ON public.business_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND plan = 'business'
    )
  );

CREATE POLICY bp_posts_owner_update ON public.business_posts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY bp_posts_owner_delete ON public.business_posts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- search_businesses function
-- =============================================
CREATE OR REPLACE FUNCTION public.search_businesses(
  p_query TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_group TEXT DEFAULT NULL,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL,
  p_radius_km INTEGER DEFAULT 25,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  profile_id UUID,
  username TEXT,
  business_name TEXT,
  business_type TEXT,
  avatar_url TEXT,
  address_city TEXT,
  avg_rating NUMERIC,
  meal_count BIGINT,
  accepts_clients BOOLEAN,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id AS profile_id,
    p.username,
    bp.business_name,
    bp.business_type,
    p.avatar_url,
    bp.address_city,
    (SELECT ROUND(AVG(m.avg_rating), 1) FROM public.meals m
     WHERE m.user_id = bp.id AND m.visibility = 'public' AND m.rating_count > 0
    ) AS avg_rating,
    (SELECT COUNT(*) FROM public.meals m
     WHERE m.user_id = bp.id AND m.visibility = 'public'
    ) AS meal_count,
    bp.accepts_clients,
    CASE
      WHEN p_lat IS NOT NULL AND bp.location IS NOT NULL
      THEN ROUND((ST_Distance(
        bp.location,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) / 1000.0)::numeric, 1)::double precision
      ELSE NULL
    END AS distance_km
  FROM public.business_profiles bp
  JOIN public.profiles p ON p.id = bp.id
  WHERE p.plan = 'business'
    AND p.subscription_status = 'active'
    AND (p_query IS NULL OR (
      bp.business_name ILIKE '%' || p_query || '%'
      OR bp.business_type ILIKE '%' || p_query || '%'
      OR bp.specialisms::TEXT ILIKE '%' || p_query || '%'
    ))
    AND (p_type IS NULL OR bp.business_type = p_type)
    AND (p_group IS NULL OR (
      (p_group = 'food_drink' AND bp.business_type IN (
        'restaurant','takeaway','cafe','pub','bakery','food_truck',
        'catering','meal_prep_service','cooking_school'
      ))
      OR (p_group = 'health_nutrition' AND bp.business_type IN (
        'nutritionist','personal_trainer','dietitian'
      ))
    ))
    AND (p_lat IS NULL OR bp.location IS NULL OR ST_DWithin(
      bp.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_km * 1000
    ))
  ORDER BY
    CASE WHEN p_lat IS NOT NULL AND bp.location IS NOT NULL
      THEN ST_Distance(bp.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)
      ELSE 999999999
    END ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- =============================================
-- get_map_business_pins function
-- =============================================
CREATE OR REPLACE FUNCTION public.get_map_business_pins(
  p_min_lng DOUBLE PRECISION,
  p_min_lat DOUBLE PRECISION,
  p_max_lng DOUBLE PRECISION,
  p_max_lat DOUBLE PRECISION,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  business_name TEXT,
  business_type TEXT,
  avatar_url TEXT,
  avg_rating NUMERIC,
  accepts_clients BOOLEAN,
  address_city TEXT,
  lng DOUBLE PRECISION,
  lat DOUBLE PRECISION,
  username TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.business_name,
    bp.business_type,
    p.avatar_url,
    (SELECT ROUND(AVG(m.avg_rating), 1) FROM public.meals m
     WHERE m.user_id = bp.id AND m.visibility = 'public' AND m.rating_count > 0) AS avg_rating,
    bp.accepts_clients,
    bp.address_city,
    ST_X(bp.location::geometry) AS lng,
    ST_Y(bp.location::geometry) AS lat,
    p.username
  FROM public.business_profiles bp
  JOIN public.profiles p ON p.id = bp.id
  WHERE bp.location IS NOT NULL
    AND p.plan = 'business'
    AND p.subscription_status = 'active'
    AND ST_Intersects(
      bp.location,
      ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)
    )
  ORDER BY avg_rating DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
