-- Reports table — content moderation reports for meals or users
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_meal_id UUID REFERENCES public.meals(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('not_food', 'inappropriate', 'spam', 'harassment', 'other')),
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  CHECK (reported_meal_id IS NOT NULL OR reported_user_id IS NOT NULL)
);

CREATE INDEX idx_reports_meal ON public.reports(reported_meal_id) WHERE reported_meal_id IS NOT NULL;
CREATE INDEX idx_reports_pending ON public.reports(status) WHERE status = 'pending';
