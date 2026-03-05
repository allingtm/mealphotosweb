-- Smart Content Moderation: tier-based moderation to reduce Cloud Vision API costs
-- See: docs/tasks/15-meal-photos-smart-moderation-spec.md

-- 1. Add moderation_tier to profiles
ALTER TABLE public.profiles
  ADD COLUMN moderation_tier TEXT NOT NULL DEFAULT 'new'
    CHECK (moderation_tier IN ('new', 'trusted', 'flagged'));

CREATE INDEX idx_profiles_moderation_tier ON public.profiles(moderation_tier);

-- 2. Add cloud_vision_checked to meal_moderation
ALTER TABLE public.meal_moderation
  ADD COLUMN cloud_vision_checked BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Backfill: all existing non-pending rows were Vision-checked
UPDATE public.meal_moderation SET cloud_vision_checked = TRUE WHERE status != 'pending';

-- 4. Backfill: promote existing users with 20+ approved uploads to trusted
UPDATE public.profiles SET moderation_tier = 'trusted'
WHERE moderation_tier = 'new'
AND id IN (
  SELECT m.user_id FROM public.meals m
  JOIN public.meal_moderation mm ON mm.meal_id = m.id
  WHERE mm.status = 'approved'
  GROUP BY m.user_id
  HAVING COUNT(*) >= 20
);

-- 5. Auto-promotion trigger function
CREATE OR REPLACE FUNCTION public.check_moderation_promotion()
RETURNS TRIGGER AS $$
DECLARE
  approved_count INTEGER;
  current_tier TEXT;
BEGIN
  -- Only act on approvals
  IF NEW.status != 'approved' THEN
    RETURN NEW;
  END IF;

  -- Get the user's current tier
  SELECT p.moderation_tier INTO current_tier
  FROM public.profiles p
  JOIN public.meals m ON m.user_id = p.id
  WHERE m.id = NEW.meal_id;

  -- Only promote if currently 'new'
  IF current_tier != 'new' THEN
    RETURN NEW;
  END IF;

  -- Count approved uploads for this user
  SELECT COUNT(*) INTO approved_count
  FROM public.meal_moderation mm
  JOIN public.meals m ON m.id = mm.meal_id
  WHERE m.user_id = (
    SELECT user_id FROM public.meals WHERE id = NEW.meal_id
  )
  AND mm.status = 'approved';

  -- Promote at 20
  IF approved_count >= 20 THEN
    UPDATE public.profiles
    SET moderation_tier = 'trusted'
    WHERE id = (
      SELECT user_id FROM public.meals WHERE id = NEW.meal_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_check_moderation_promotion
  AFTER INSERT OR UPDATE ON public.meal_moderation
  FOR EACH ROW
  EXECUTE FUNCTION public.check_moderation_promotion();
