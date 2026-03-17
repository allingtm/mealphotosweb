-- Invite codes for beta signup gating
CREATE TABLE public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL CHECK (code ~ '^[A-Z0-9]{4,20}$'),
  label TEXT CHECK (char_length(label) <= 100),
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  current_uses INTEGER NOT NULL DEFAULT 0 CHECK (current_uses >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invite_codes_code ON public.invite_codes(code);
CREATE INDEX idx_invite_codes_active ON public.invite_codes(is_active) WHERE is_active = TRUE;

-- Track which invite code each user redeemed
ALTER TABLE public.profiles ADD COLUMN invite_code_id UUID REFERENCES public.invite_codes(id) ON DELETE SET NULL;

-- RLS: no user-facing policies, all access via service role
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Atomically validate and redeem an invite code
CREATE OR REPLACE FUNCTION public.redeem_invite_code(p_code TEXT, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_code_id UUID;
BEGIN
  UPDATE public.invite_codes
  SET current_uses = current_uses + 1
  WHERE code = UPPER(TRIM(p_code))
    AND is_active = TRUE
    AND current_uses < max_uses
    AND (expires_at IS NULL OR expires_at > now())
  RETURNING id INTO v_code_id;

  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  UPDATE public.profiles
  SET invite_code_id = v_code_id
  WHERE id = p_user_id;

  RETURN v_code_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
