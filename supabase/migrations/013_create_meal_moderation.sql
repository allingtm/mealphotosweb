-- Meal moderation table — tracks automated moderation results
CREATE TABLE public.meal_moderation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'manual_review')),
  moderation_labels JSONB DEFAULT '{}',
  reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_moderation_pending ON public.meal_moderation(status) WHERE status IN ('pending', 'manual_review');
