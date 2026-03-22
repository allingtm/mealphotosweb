-- ============================================
-- Migration 043: Business Team Members
-- Allows multiple users to manage a business
-- ============================================

-- 1. Create business_team_members table
CREATE TABLE public.business_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  permissions JSONB NOT NULL DEFAULT '{"can_post_dishes": true, "can_manage_menu": false}',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (business_id, user_id)
);

CREATE INDEX idx_btm_business ON public.business_team_members(business_id);
CREATE INDEX idx_btm_user ON public.business_team_members(user_id);

ALTER TABLE public.business_team_members ENABLE ROW LEVEL SECURITY;

-- 2. Create business_team_invites table
CREATE TABLE public.business_team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bti_token ON public.business_team_invites(token);
CREATE INDEX idx_bti_business ON public.business_team_invites(business_id);

ALTER TABLE public.business_team_invites ENABLE ROW LEVEL SECURITY;

-- 3. Add posted_by column to dishes
ALTER TABLE public.dishes ADD COLUMN posted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Seed existing business owners into team members
INSERT INTO public.business_team_members (business_id, user_id, role, permissions)
SELECT id, id, 'owner', '{"can_post_dishes": true, "can_manage_menu": true}'::jsonb
FROM public.profiles
WHERE is_business = TRUE
ON CONFLICT DO NOTHING;

-- 5. Helper function: get the business_id a user belongs to
CREATE OR REPLACE FUNCTION public.get_team_business_id(p_user_id UUID)
RETURNS UUID AS $$
  SELECT business_id
  FROM public.business_team_members
  WHERE user_id = p_user_id
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- 6. Helper function: get the role for a user in a specific business
CREATE OR REPLACE FUNCTION public.get_team_role(p_user_id UUID, p_business_id UUID)
RETURNS TEXT AS $$
  SELECT role
  FROM public.business_team_members
  WHERE user_id = p_user_id AND business_id = p_business_id
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- 7. Helper function: check if user is a team member of a business
CREATE OR REPLACE FUNCTION public.is_team_member(p_user_id UUID, p_business_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_team_members
    WHERE user_id = p_user_id AND business_id = p_business_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- ============================================
-- RLS Policies: business_team_members
-- ============================================

-- Owner can see all their team members; members can see their own row
CREATE POLICY "btm_select"
  ON public.business_team_members FOR SELECT
  USING (business_id = auth.uid() OR user_id = auth.uid());

-- Only owner can remove team members (not themselves)
CREATE POLICY "btm_delete"
  ON public.business_team_members FOR DELETE
  USING (business_id = auth.uid() AND user_id != auth.uid());

-- Insert/update handled via service role in API routes (no authenticated policy)

-- ============================================
-- RLS Policies: business_team_invites
-- ============================================

-- Owner can see their invites
CREATE POLICY "bti_select"
  ON public.business_team_invites FOR SELECT
  USING (business_id = auth.uid());

-- Insert/update/delete handled via service role in API routes

-- ============================================
-- Update existing RLS policies to allow team members
-- ============================================

-- dishes: update INSERT policy to allow team members
DROP POLICY IF EXISTS "Business can insert own dishes" ON public.dishes;
CREATE POLICY "Business or team can insert dishes"
  ON public.dishes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = business_id
    OR public.is_team_member(auth.uid(), business_id)
  );

-- dishes: update DELETE policy to allow team members
DROP POLICY IF EXISTS "Business can delete own dishes" ON public.dishes;
CREATE POLICY "Business or team can delete dishes"
  ON public.dishes FOR DELETE TO authenticated
  USING (
    auth.uid() = business_id
    OR public.is_team_member(auth.uid(), business_id)
  );

-- menu_sections: replace ALL policy to allow team members
DROP POLICY IF EXISTS "Business can manage own sections" ON public.menu_sections;
CREATE POLICY "Business or team can manage sections"
  ON public.menu_sections FOR ALL TO authenticated
  USING (
    auth.uid() = business_id
    OR public.is_team_member(auth.uid(), business_id)
  )
  WITH CHECK (
    auth.uid() = business_id
    OR public.is_team_member(auth.uid(), business_id)
  );

-- menu_items: replace ALL policy to allow team members
DROP POLICY IF EXISTS "Business can manage own items" ON public.menu_items;
CREATE POLICY "Business or team can manage items"
  ON public.menu_items FOR ALL TO authenticated
  USING (
    auth.uid() = business_id
    OR public.is_team_member(auth.uid(), business_id)
  )
  WITH CHECK (
    auth.uid() = business_id
    OR public.is_team_member(auth.uid(), business_id)
  );

-- dish_images: update INSERT policy to allow team members
DROP POLICY IF EXISTS "Business can insert dish images" ON public.dish_images;
CREATE POLICY "Business or team can insert dish images"
  ON public.dish_images FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dishes d
      WHERE d.id = dish_images.dish_id
      AND (
        d.business_id = auth.uid()
        OR public.is_team_member(auth.uid(), d.business_id)
      )
    )
  );

-- business_premises: add SELECT for team members (they can already see active ones, but this lets them see inactive too)
DROP POLICY IF EXISTS "Anyone can read active premises or own premises" ON public.business_premises;
CREATE POLICY "Read premises: public active or owner/team"
  ON public.business_premises FOR SELECT
  USING (
    is_active = true
    OR owner_id = auth.uid()
    OR public.is_team_member(auth.uid(), owner_id)
  );
