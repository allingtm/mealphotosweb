CREATE TABLE public.venue_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  restaurant_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  venue_mapbox_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('not_served_here', 'wrong_location', 'fake_photo', 'other')),
  detail TEXT CHECK (char_length(detail) <= 280),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'upheld', 'dismissed')),
  reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  CONSTRAINT unique_dispute_per_meal UNIQUE (meal_id, restaurant_profile_id)
);

CREATE INDEX idx_venue_disputes_pending ON public.venue_disputes(status) WHERE status = 'pending';
CREATE INDEX idx_venue_disputes_meal ON public.venue_disputes(meal_id);
CREATE INDEX idx_venue_disputes_restaurant ON public.venue_disputes(restaurant_profile_id);

ALTER TABLE public.venue_disputes ENABLE ROW LEVEL SECURITY;

-- Restaurants can insert disputes for meals at their claimed venue
CREATE POLICY "Restaurants can create disputes"
  ON public.venue_disputes FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.restaurant_claims rc
      WHERE rc.claimed_by = auth.uid()
        AND rc.venue_mapbox_id = venue_disputes.venue_mapbox_id
        AND rc.outreach_status = 'claimed'
    )
  );

-- Restaurants can view their own disputes
CREATE POLICY "Restaurants can view own disputes"
  ON public.venue_disputes FOR SELECT
  TO authenticated
  USING (restaurant_profile_id = auth.uid());
