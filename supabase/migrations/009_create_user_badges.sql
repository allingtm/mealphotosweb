-- User badges table — unique badge types per user
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_type)
);
