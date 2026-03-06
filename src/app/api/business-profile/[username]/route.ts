import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'rl:business-profile-get',
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { username } = await params;
    if (!username || username.length > 30) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch profile + business profile in one query
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, avatar_url, plan, subscription_status, follower_count, following_count')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.plan !== 'business' || profile.subscription_status !== 'active') {
      return NextResponse.json({ error: 'Not a business profile' }, { status: 404 });
    }

    const { data: businessProfile, error: bpError } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('id', profile.id)
      .single();

    if (bpError || !businessProfile) {
      return NextResponse.json({ error: 'Business profile not found' }, { status: 404 });
    }

    // Get meal stats
    const { data: mealStats } = await supabase
      .from('meals')
      .select('avg_rating, rating_count')
      .eq('user_id', profile.id)
      .eq('visibility', 'public');

    const meals = mealStats ?? [];
    const mealCount = meals.length;
    const ratedMeals = meals.filter((m) => m.rating_count > 0);
    const avgRating = ratedMeals.length > 0
      ? Math.round((ratedMeals.reduce((sum, m) => sum + m.avg_rating, 0) / ratedMeals.length) * 10) / 10
      : null;

    const response = NextResponse.json({
      profile: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        follower_count: profile.follower_count,
        following_count: profile.following_count,
      },
      business: businessProfile,
      stats: {
        meal_count: mealCount,
        avg_rating: avgRating,
      },
    });

    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    return response;
  } catch (err) {
    console.error('Business profile GET error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
