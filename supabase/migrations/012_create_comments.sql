-- Comments table — meal comments with 280 char limit
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) <= 280),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comments_meal ON public.comments(meal_id, created_at DESC);
