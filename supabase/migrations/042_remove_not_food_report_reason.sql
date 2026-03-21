-- Remove 'not_food' as a report reason — businesses can post non-food content (team photos, venue shots, etc.)

-- Migrate any existing not_food reports to 'other'
UPDATE public.reports SET reason = 'other' WHERE reason = 'not_food';

-- Replace constraint without not_food
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_reason_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_reason_check CHECK (
    reason IN (
      'inappropriate', 'spam', 'harassment', 'other',
      'stolen_photo', 'wrong_venue', 'food_safety', 'privacy', 'copyright'
    )
  );
