import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'read');
  if (rateLimited) return rateLimited;

  // Get aggregated stats via DB function
  const { data: stats, error: statsError } = await supabase.rpc('get_dashboard_stats', {
    p_business_id: user.id,
  });

  if (statsError) {
    return NextResponse.json({ error: statsError.message }, { status: 500 });
  }

  // Top dishes by reaction count
  const { data: topDishes } = await supabase
    .from('dishes')
    .select('id, title, reaction_count, photo_url')
    .eq('business_id', user.id)
    .order('reaction_count', { ascending: false })
    .limit(5);

  // Dish requests nearby (fetch all for now — location filtering in V3-16)
  const { data: dishRequests } = await supabase
    .from('dish_requests')
    .select('id, dish_name, upvote_count, location_city')
    .order('upvote_count', { ascending: false })
    .limit(5);

  return NextResponse.json({
    stats: stats ?? {},
    topDishes: topDishes ?? [],
    dishRequests: dishRequests ?? [],
  });
}
