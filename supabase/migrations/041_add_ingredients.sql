-- Add ingredients column to dishes
ALTER TABLE public.dishes
  ADD COLUMN ingredients text[] DEFAULT '{}';

-- GIN index for array containment queries (@> operator)
CREATE INDEX idx_dishes_ingredients ON public.dishes USING GIN (ingredients);

-- Ingredients lookup table for autocomplete
CREATE TABLE public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ingredients_normalized ON public.ingredients (normalized_name);
CREATE INDEX idx_ingredients_usage ON public.ingredients (usage_count DESC);

-- Enable RLS
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY ingredients_public_read ON public.ingredients
  FOR SELECT USING (true);

-- Business users can insert new ingredients
CREATE POLICY ingredients_business_insert ON public.ingredients
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_business = true
    )
  );

-- RPC function to upsert ingredient and increment usage count
CREATE OR REPLACE FUNCTION public.upsert_ingredient(
  p_name TEXT,
  p_normalized_name TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.ingredients (name, normalized_name)
  VALUES (p_name, p_normalized_name)
  ON CONFLICT (normalized_name) DO UPDATE SET usage_count = ingredients.usage_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Seed common ingredients (British English)
INSERT INTO public.ingredients (name, normalized_name, category) VALUES
  -- Proteins
  ('Chicken', 'chicken', 'protein'),
  ('Beef', 'beef', 'protein'),
  ('Lamb', 'lamb', 'protein'),
  ('Pork', 'pork', 'protein'),
  ('Salmon', 'salmon', 'protein'),
  ('Tuna', 'tuna', 'protein'),
  ('Prawns', 'prawns', 'protein'),
  ('Cod', 'cod', 'protein'),
  ('Duck', 'duck', 'protein'),
  ('Turkey', 'turkey', 'protein'),
  ('Tofu', 'tofu', 'protein'),
  ('Eggs', 'eggs', 'protein'),
  ('Bacon', 'bacon', 'protein'),
  ('Chorizo', 'chorizo', 'protein'),
  ('Halloumi', 'halloumi', 'protein'),
  -- Dairy
  ('Mozzarella', 'mozzarella', 'dairy'),
  ('Parmesan', 'parmesan', 'dairy'),
  ('Cheddar', 'cheddar', 'dairy'),
  ('Cream', 'cream', 'dairy'),
  ('Butter', 'butter', 'dairy'),
  ('Goat Cheese', 'goat cheese', 'dairy'),
  ('Feta', 'feta', 'dairy'),
  ('Mascarpone', 'mascarpone', 'dairy'),
  -- Vegetables
  ('Tomato', 'tomato', 'vegetable'),
  ('Onion', 'onion', 'vegetable'),
  ('Garlic', 'garlic', 'vegetable'),
  ('Mushroom', 'mushroom', 'vegetable'),
  ('Spinach', 'spinach', 'vegetable'),
  ('Avocado', 'avocado', 'vegetable'),
  ('Pepper', 'pepper', 'vegetable'),
  ('Courgette', 'courgette', 'vegetable'),
  ('Aubergine', 'aubergine', 'vegetable'),
  ('Broccoli', 'broccoli', 'vegetable'),
  ('Sweet Potato', 'sweet potato', 'vegetable'),
  ('Potato', 'potato', 'vegetable'),
  ('Sweetcorn', 'sweetcorn', 'vegetable'),
  ('Asparagus', 'asparagus', 'vegetable'),
  ('Beetroot', 'beetroot', 'vegetable'),
  ('Carrot', 'carrot', 'vegetable'),
  ('Rocket', 'rocket', 'vegetable'),
  ('Kale', 'kale', 'vegetable'),
  ('Leek', 'leek', 'vegetable'),
  -- Grains & Carbs
  ('Rice', 'rice', 'grain'),
  ('Pasta', 'pasta', 'grain'),
  ('Bread', 'bread', 'grain'),
  ('Noodles', 'noodles', 'grain'),
  ('Couscous', 'couscous', 'grain'),
  ('Quinoa', 'quinoa', 'grain'),
  ('Flatbread', 'flatbread', 'grain'),
  -- Herbs
  ('Basil', 'basil', 'herb'),
  ('Coriander', 'coriander', 'herb'),
  ('Parsley', 'parsley', 'herb'),
  ('Mint', 'mint', 'herb'),
  ('Rosemary', 'rosemary', 'herb'),
  ('Thyme', 'thyme', 'herb'),
  ('Dill', 'dill', 'herb'),
  -- Spices
  ('Chilli', 'chilli', 'spice'),
  ('Cumin', 'cumin', 'spice'),
  ('Turmeric', 'turmeric', 'spice'),
  ('Ginger', 'ginger', 'spice'),
  ('Saffron', 'saffron', 'spice'),
  ('Paprika', 'paprika', 'spice'),
  ('Cinnamon', 'cinnamon', 'spice'),
  -- Other
  ('Truffle', 'truffle', 'other'),
  ('Olive Oil', 'olive oil', 'condiment'),
  ('Soy Sauce', 'soy sauce', 'condiment'),
  ('Coconut Milk', 'coconut milk', 'other'),
  ('Honey', 'honey', 'other'),
  ('Tahini', 'tahini', 'condiment'),
  ('Sriracha', 'sriracha', 'condiment'),
  ('Lemon', 'lemon', 'fruit'),
  ('Lime', 'lime', 'fruit'),
  ('Mango', 'mango', 'fruit'),
  ('Pomegranate', 'pomegranate', 'fruit')
ON CONFLICT (normalized_name) DO NOTHING;
