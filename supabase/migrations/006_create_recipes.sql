-- Recipes table — structured recipe data with ingredients JSONB and method steps
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID UNIQUE NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  ingredients JSONB NOT NULL,
  method TEXT[] NOT NULL,
  cook_time_minutes INTEGER CHECK (cook_time_minutes > 0 AND cook_time_minutes <= 1440),
  serves INTEGER CHECK (serves > 0 AND serves <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
