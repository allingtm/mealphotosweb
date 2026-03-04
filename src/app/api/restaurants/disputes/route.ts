import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { disputeSchema } from '@/lib/validations';
import { verifyActiveSubscription } from '@/lib/subscription';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 d'),
  prefix: 'rl:disputes',
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Rate limit by user ID (authenticated restaurant)
    const { success: rateLimitOk } = await ratelimit.limit(user.id);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Dispute limit reached. Maximum 10 disputes per day.' },
        { status: 429 }
      );
    }

    // Must be a restaurant with active subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_restaurant')
      .eq('id', user.id)
      .single();

    if (!profile?.is_restaurant) {
      return NextResponse.json({ error: 'Restaurant account required' }, { status: 403 });
    }

    const sub = await verifyActiveSubscription(user.id, supabase);
    if (!sub.active) {
      return NextResponse.json({ error: 'Active subscription required' }, { status: 403 });
    }

    // Validate body
    const body = await request.json();
    const parsed = disputeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { meal_id, reason, detail } = parsed.data;

    // Fetch the meal to get venue data
    const { data: meal } = await supabase
      .from('meals')
      .select('venue_mapbox_id, venue_name, user_id')
      .eq('id', meal_id)
      .single();

    if (!meal?.venue_mapbox_id || !meal?.venue_name) {
      return NextResponse.json(
        { error: 'Meal has no venue tag to dispute' },
        { status: 400 }
      );
    }

    // Cannot dispute own meals
    if (meal.user_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot dispute your own meal' },
        { status: 400 }
      );
    }

    // Verify the restaurant has a claim on this venue
    const { data: claim } = await supabase
      .from('restaurant_claims')
      .select('id')
      .eq('venue_mapbox_id', meal.venue_mapbox_id)
      .eq('claimed_by', user.id)
      .eq('outreach_status', 'claimed')
      .single();

    if (!claim) {
      return NextResponse.json(
        { error: 'You have not claimed this venue' },
        { status: 403 }
      );
    }

    // Insert dispute
    const { error } = await supabase.from('venue_disputes').insert({
      meal_id,
      restaurant_profile_id: user.id,
      venue_mapbox_id: meal.venue_mapbox_id,
      reason,
      detail: detail ?? null,
    });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'You have already disputed this meal' },
          { status: 409 }
        );
      }
      console.error('Dispute insert error:', error);
      return NextResponse.json({ error: 'Failed to submit dispute' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('Disputes error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
