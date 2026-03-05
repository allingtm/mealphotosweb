-- Add ban/suspension fields to profiles for admin member management
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT CHECK (char_length(ban_reason) <= 500);

CREATE INDEX IF NOT EXISTS idx_profiles_banned ON public.profiles(banned_at) WHERE banned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON public.profiles(suspended_until) WHERE suspended_until IS NOT NULL;
