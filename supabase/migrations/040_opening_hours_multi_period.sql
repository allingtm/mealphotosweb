-- Migration: Convert opening_hours from single-period to multi-period (array) per day
-- Before: { "mon": { "open": "09:00", "close": "17:00" } }
-- After:  { "mon": [{ "open": "09:00", "close": "17:00" }] }

-- business_profiles
UPDATE public.business_profiles
SET opening_hours = (
  SELECT jsonb_object_agg(key, jsonb_build_array(value))
  FROM jsonb_each(opening_hours)
)
WHERE opening_hours IS NOT NULL;

-- business_premises
UPDATE public.business_premises
SET opening_hours = (
  SELECT jsonb_object_agg(key, jsonb_build_array(value))
  FROM jsonb_each(opening_hours)
)
WHERE opening_hours IS NOT NULL;
