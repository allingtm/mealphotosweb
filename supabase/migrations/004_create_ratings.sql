-- Ratings table — one rating per user per meal
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score >= 1 AND score <= 10),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meal_id, user_id)
);

CREATE INDEX idx_ratings_meal_id ON public.ratings(meal_id);
CREATE INDEX idx_ratings_user_id ON public.ratings(user_id);
CREATE INDEX idx_ratings_recent ON public.ratings(meal_id, created_at DESC);
