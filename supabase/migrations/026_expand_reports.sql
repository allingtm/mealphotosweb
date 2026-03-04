-- Expand report reasons
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_reason_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_reason_check CHECK (
    reason IN (
      'not_food', 'inappropriate', 'spam', 'harassment', 'other',
      'stolen_photo', 'wrong_venue', 'food_safety', 'privacy', 'copyright'
    )
  );

-- Add priority column
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'standard'
  CHECK (priority IN ('urgent', 'high', 'standard'));

-- Index for admin queue ordering
CREATE INDEX IF NOT EXISTS idx_reports_priority ON public.reports(priority, created_at);
