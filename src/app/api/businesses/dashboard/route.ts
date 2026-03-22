import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';
import { resolveBusinessContext } from '@/lib/team';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'read');
  if (rateLimited) return rateLimited;

  const ctx = await resolveBusinessContext(supabase, user.id);
  if (!ctx) return NextResponse.json({ error: 'Business access required' }, { status: 403 });

  // Get aggregated stats via DB function
  const { data: stats, error: statsError } = await supabase.rpc('get_dashboard_stats', {
    p_business_id: ctx.businessId,
  });

  if (statsError) {
    return NextResponse.json({ error: statsError.message }, { status: 500 });
  }

  // Top dishes by reaction count
  const { data: topDishes } = await supabase
    .from('dishes')
    .select('id, title, reaction_count, photo_url')
    .eq('business_id', ctx.businessId)
    .order('reaction_count', { ascending: false })
    .limit(5);

  // Dish requests filtered by business city
  const { data: bizProfile } = await supabase
    .from('business_profiles')
    .select('address_city')
    .eq('id', ctx.businessId)
    .single();

  let dishRequestsQuery = supabase
    .from('dish_requests')
    .select('id, dish_name, upvote_count, location_city')
    .order('upvote_count', { ascending: false })
    .limit(5);

  if (bizProfile?.address_city) {
    dishRequestsQuery = dishRequestsQuery.ilike('location_city', `%${bizProfile.address_city}%`);
  }

  const { data: dishRequests } = await dishRequestsQuery;

  // Recent comments from customers
  const { data: recentComments } = await supabase
    .from('comments')
    .select(`
      id, dish_id, text, created_at,
      profiles!inner(username, display_name, avatar_url, is_business),
      dishes!inner(id, title, photo_url, business_id)
    `)
    .eq('dishes.business_id', ctx.businessId)
    .eq('visible', true)
    .neq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  return NextResponse.json({
    stats: stats ?? {},
    topDishes: topDishes ?? [],
    dishRequests: dishRequests ?? [],
    recentComments: recentComments ?? [],
  });
}
