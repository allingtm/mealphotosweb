-- Profiles table — extends Supabase auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$'),
  display_name TEXT CHECK (char_length(display_name) <= 50),
  bio TEXT CHECK (char_length(bio) <= 160),
  avatar_url TEXT,
  location_city TEXT,
  location_country TEXT,
  streak_current INTEGER DEFAULT 0,
  streak_best INTEGER DEFAULT 0,
  streak_last_upload DATE,
  timezone TEXT DEFAULT 'UTC' CHECK (char_length(timezone) <= 50),
  is_restaurant BOOLEAN DEFAULT FALSE,
  stripe_customer_id TEXT UNIQUE,
  subscription_tier TEXT CHECK (subscription_tier IN ('basic', 'premium')),
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'past_due', 'cancelled', 'inactive')),
  subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_username ON public.profiles(username);
