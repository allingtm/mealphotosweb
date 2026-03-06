-- Business profiles table for type-specific fields
CREATE TABLE public.business_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_type TEXT NOT NULL CHECK (business_type IN (
    'restaurant', 'takeaway', 'cafe', 'pub', 'bakery',
    'food_truck', 'catering',
    'nutritionist', 'personal_trainer', 'dietitian',
    'meal_prep_service', 'cooking_school',
    'other'
  )),

  -- Shared fields (all types)
  business_name TEXT NOT NULL CHECK (char_length(business_name) <= 100),
  phone TEXT CHECK (char_length(phone) <= 20),
  email TEXT,
  website_url TEXT CHECK (char_length(website_url) <= 255),
  booking_url TEXT CHECK (char_length(booking_url) <= 255),

  -- Location (Food & Drink types primarily)
  address_line_1 TEXT,
  address_line_2 TEXT,
  address_city TEXT,
  address_postcode TEXT,
  address_country TEXT DEFAULT 'GB',
  location GEOGRAPHY(Point, 4326),

  -- Food & Drink specific
  opening_hours JSONB,
  cuisine_types TEXT[],
  delivery_available BOOLEAN DEFAULT FALSE,
  menu_url TEXT,

  -- Health & Nutrition specific
  qualifications TEXT[],
  specialisms TEXT[],
  accepts_clients BOOLEAN DEFAULT TRUE,
  consultation_type TEXT[],
  service_area TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_business_profiles_type ON public.business_profiles(business_type);
CREATE INDEX idx_business_profiles_location ON public.business_profiles USING GIST(location);

-- RLS
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- Public read (business profiles are discoverable)
CREATE POLICY bp_public_read ON public.business_profiles
  FOR SELECT USING (true);

-- Owners can update their own
CREATE POLICY bp_owner_update ON public.business_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Insert handled via service role during onboarding (no authenticated INSERT policy)
