-- Add venue tagging columns to meals table for restaurant inbound acquisition
ALTER TABLE public.meals ADD COLUMN venue_name TEXT;
ALTER TABLE public.meals ADD COLUMN venue_mapbox_id TEXT;
ALTER TABLE public.meals ADD COLUMN venue_address TEXT;

CREATE INDEX idx_meals_venue_mapbox_id ON public.meals(venue_mapbox_id);
CREATE INDEX idx_meals_venue_name ON public.meals(venue_name);
