import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchSchema } from '@/lib/validations/search';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const rateLimited = await applyRateLimit(ip, 'search');
  if (rateLimited) return rateLimited;

  const supabase = await createClient();
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = searchSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid params', details: parsed.error.flatten() }, { status: 400 });
  }

  const { q, limit, cuisine, dietary, ingredients, minPrice, maxPrice, cursor } = parsed.data;

  // --- Dishes search ---
  let dishQuery = supabase
    .from('dishes')
    .select(`
      id, title, photo_url, price_pence, reaction_count, created_at,
      profiles!inner(username),
      business_profiles!inner(business_name, business_type, address_city, cuisine_types)
    `)
    .textSearch('title', q, { type: 'websearch' })
    .order('reaction_count', { ascending: false });

  // Ingredient filter (uses GIN index)
  if (ingredients) {
    const ingredientList = ingredients.split(',').map((s) => s.trim()).filter(Boolean);
    if (ingredientList.length > 0) {
      dishQuery = dishQuery.contains('ingredients', ingredientList);
    }
  }

  // Price filters
  if (minPrice) dishQuery = dishQuery.gte('price_pence', parseInt(minPrice));
  if (maxPrice) dishQuery = dishQuery.lte('price_pence', parseInt(maxPrice));

  // Cursor pagination
  if (cursor) {
    const { data: cursorDish } = await supabase
      .from('dishes')
      .select('reaction_count')
      .eq('id', cursor)
      .single();
    if (cursorDish) {
      dishQuery = dishQuery.lte('reaction_count', cursorDish.reaction_count);
    }
  }

  const { data: allDishes } = await dishQuery.limit(limit + 1);

  // Apply cuisine filter client-side (Supabase can't filter nested join array columns)
  let filteredDishes = allDishes ?? [];
  if (cuisine) {
    filteredDishes = filteredDishes.filter((d) => {
      const bp = d.business_profiles as { cuisine_types?: string[] | null };
      return bp.cuisine_types?.some(
        (c: string) => c.toLowerCase() === cuisine.toLowerCase(),
      );
    });
  }

  const hasMore = filteredDishes.length > limit;
  const dishes = filteredDishes.slice(0, limit);
  const nextCursor = hasMore ? dishes[dishes.length - 1]?.id : null;

  // --- Businesses search ---
  const { data: businesses } = await supabase
    .from('business_profiles')
    .select(`
      id, business_name, business_type, address_city, cuisine_types,
      profiles!inner(username, avatar_url, plan, subscription_status)
    `)
    .eq('profiles.subscription_status', 'active')
    .ilike('business_name', `%${q}%`)
    .limit(limit);

  // Apply cuisine filter on businesses too
  let filteredBusinesses = businesses ?? [];
  if (cuisine) {
    filteredBusinesses = filteredBusinesses.filter((b) =>
      b.cuisine_types?.some(
        (c: string) => c.toLowerCase() === cuisine.toLowerCase(),
      ),
    );
  }

  // --- Menu items search ---
  let menuItemQuery = supabase
    .from('menu_items')
    .select(`
      id, name, price_pence, dietary_tags,
      business_profiles:business_id(business_name, address_city),
      profiles:business_id(username)
    `)
    .ilike('name', `%${q}%`)
    .eq('available', true);

  if (dietary) {
    const tags = dietary.split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length > 0) {
      menuItemQuery = menuItemQuery.contains('dietary_tags', tags);
    }
  }

  const { data: menuItems } = await menuItemQuery.limit(limit);

  return NextResponse.json({
    dishes,
    businesses: filteredBusinesses,
    menuItems: menuItems ?? [],
    nextCursor,
  });
}
