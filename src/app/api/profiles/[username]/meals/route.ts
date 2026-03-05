import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ username: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { username } = await params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const tab = searchParams.get('tab') || 'all'; // all | own | diner
    const limit = 18;

    const supabase = await createClient();

    // Get profile ID from username
    const { data } = await supabase
      .rpc('get_public_profile', { lookup_username: username })
      .single();

    const profile = data as { id: string; is_restaurant: boolean } | null;
    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let query = supabase
      .from('meals')
      .select('id, photo_url, avg_rating, rating_count, created_at, user_id, venue_mapbox_id, meal_moderation!inner(status)')
      .eq('meal_moderation.status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply tab filter
    if (profile.is_restaurant && tab === 'own') {
      // Restaurant's own uploads
      query = query.eq('user_id', profile.id);
    } else if (profile.is_restaurant && tab === 'diner') {
      // Meals tagged at this venue by other users
      // Need to get the restaurant's venue_mapbox_id first
      const { data: restaurantMeal } = await supabase
        .from('meals')
        .select('venue_mapbox_id')
        .eq('user_id', profile.id)
        .not('venue_mapbox_id', 'is', null)
        .limit(1)
        .single();

      if (restaurantMeal?.venue_mapbox_id) {
        query = query
          .eq('venue_mapbox_id', restaurantMeal.venue_mapbox_id)
          .neq('user_id', profile.id);
      } else {
        return NextResponse.json({ meals: [], nextCursor: null });
      }
    } else if (profile.is_restaurant && tab === 'all') {
      // All meals at this venue (own + diner)
      const { data: restaurantMeal } = await supabase
        .from('meals')
        .select('venue_mapbox_id')
        .eq('user_id', profile.id)
        .not('venue_mapbox_id', 'is', null)
        .limit(1)
        .single();

      if (restaurantMeal?.venue_mapbox_id) {
        query = query.or(`user_id.eq.${profile.id},venue_mapbox_id.eq.${restaurantMeal.venue_mapbox_id}`);
      } else {
        query = query.eq('user_id', profile.id);
      }
    } else {
      // Regular user — their meals only
      query = query.eq('user_id', profile.id);
    }

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: meals, error } = await query;

    if (error) {
      console.error('Profile meals fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 });
    }

    const items = (meals ?? []).map(m => ({
      id: m.id,
      photo_url: m.photo_url,
      avg_rating: m.avg_rating,
      rating_count: m.rating_count,
      created_at: m.created_at,
    }));

    const nextCursor = items.length === limit ? items[items.length - 1].created_at : null;

    return NextResponse.json({ meals: items, nextCursor });
  } catch (err) {
    console.error('Profile meals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
