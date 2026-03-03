-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_moderation ENABLE ROW LEVEL SECURITY;

-- Profiles: own read/write, public access via view
CREATE POLICY "Users can read own full profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Public profiles view (safe subset of fields, SECURITY INVOKER)
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, username, display_name, avatar_url, location_city, location_country,
       streak_current, streak_best, is_restaurant, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Meals: public read, own write
CREATE POLICY "Meals are publicly readable" ON public.meals FOR SELECT USING (true);
CREATE POLICY "Users can insert own meals" ON public.meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal metadata" ON public.meals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own meals" ON public.meals FOR DELETE USING (auth.uid() = user_id);

-- Ratings: public read, authenticated insert only (no update/delete)
CREATE POLICY "Ratings are publicly readable" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can rate" ON public.ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Recipe requests: public read, authenticated insert
CREATE POLICY "Recipe requests are readable" ON public.recipe_requests FOR SELECT USING (true);
CREATE POLICY "Authenticated users can request" ON public.recipe_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Recipes: public read, meal owner write
CREATE POLICY "Recipes are publicly readable" ON public.recipes FOR SELECT USING (true);
CREATE POLICY "Meal owners can add recipe" ON public.recipes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.meals WHERE meals.id = meal_id AND meals.user_id = auth.uid()));

-- Follows: public read, own write
CREATE POLICY "Follows are publicly readable" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users manage own follows" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Notifications: own read/write only
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mark own read" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Badges: public read
CREATE POLICY "Badges are publicly readable" ON public.user_badges FOR SELECT USING (true);

-- Reports: own insert only (admin reads via service role)
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Blocked users: own read/write
CREATE POLICY "Users can read own blocks" ON public.blocked_users FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can block" ON public.blocked_users FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can unblock" ON public.blocked_users FOR DELETE USING (auth.uid() = blocker_id);

-- Comments: public read, own insert, own delete
CREATE POLICY "Comments are publicly readable" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Meal moderation: no public access (admin only via service role)
-- No policies created = no public access
