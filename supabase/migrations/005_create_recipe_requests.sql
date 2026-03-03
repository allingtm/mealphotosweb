-- Recipe requests table — one request per user per meal
CREATE TABLE public.recipe_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meal_id, user_id)
);

CREATE INDEX idx_recipe_requests_meal_id ON public.recipe_requests(meal_id);
