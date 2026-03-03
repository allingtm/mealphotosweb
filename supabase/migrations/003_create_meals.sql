-- Meals table — photo uploads with location and rating aggregates
CREATE TABLE public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 120),
  photo_url TEXT NOT NULL,
  cloudflare_image_id TEXT,
  photo_blur_hash TEXT,
  location GEOGRAPHY(Point, 4326),
  location_city TEXT,
  location_country TEXT,
  tags TEXT[] DEFAULT '{}',
  cuisine TEXT CHECK (cuisine IN ('italian','asian','mexican','british','indian','middle_eastern','american','french','other')),
  rating_count INTEGER DEFAULT 0,
  rating_sum INTEGER DEFAULT 0,
  avg_rating NUMERIC(3,1) DEFAULT 0.0,
  recipe_request_count INTEGER DEFAULT 0,
  recipe_unlock_threshold INTEGER DEFAULT 100,
  recipe_unlocked BOOLEAN DEFAULT FALSE,
  is_restaurant_meal BOOLEAN DEFAULT FALSE,
  restaurant_id UUID REFERENCES public.profiles(id),
  restaurant_revealed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_meals_user_id ON public.meals(user_id);
CREATE INDEX idx_meals_created_at ON public.meals(created_at DESC);
CREATE INDEX idx_meals_location ON public.meals USING GIST(location);
CREATE INDEX idx_meals_avg_rating ON public.meals(avg_rating DESC);
CREATE INDEX idx_meals_feed ON public.meals(created_at DESC, rating_count, avg_rating);
