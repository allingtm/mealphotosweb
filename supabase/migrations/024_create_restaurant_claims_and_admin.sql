-- Add is_admin to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- restaurant_claims: records when a restaurant account has claimed a venue
CREATE TABLE public.restaurant_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_mapbox_id TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  claimed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  outreach_status TEXT NOT NULL DEFAULT 'claimed'
    CHECK (outreach_status IN ('pending', 'claimed', 'verified', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_mapbox_id, claimed_by)
);

CREATE INDEX idx_restaurant_claims_venue ON public.restaurant_claims(venue_mapbox_id);
CREATE INDEX idx_restaurant_claims_claimer ON public.restaurant_claims(claimed_by);

-- RLS
ALTER TABLE public.restaurant_claims ENABLE ROW LEVEL SECURITY;

-- Public can read claims (needed for verified badge JOIN in get_feed)
CREATE POLICY "Claims are publicly readable"
  ON public.restaurant_claims FOR SELECT
  USING (true);

-- Restaurants can insert claims
CREATE POLICY "Restaurants can create claims"
  ON public.restaurant_claims FOR INSERT
  WITH CHECK (
    auth.uid() = claimed_by
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_restaurant = TRUE
    )
  );
