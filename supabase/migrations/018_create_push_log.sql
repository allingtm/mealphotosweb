-- Push notification frequency cap log
CREATE TABLE public.push_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_push_log_user_day ON public.push_log(user_id, sent_at);

ALTER TABLE public.push_log ENABLE ROW LEVEL SECURITY;
