-- Allow 'personal' as a subscription_tier value
ALTER TABLE public.profiles DROP CONSTRAINT profiles_subscription_tier_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN ('basic', 'premium', 'personal'));
