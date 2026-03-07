import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapPinsQuerySchema } from '@/lib/validations/map';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'rl:map-pins',
});

function timeRangeToTimestamp(range: string): string | null {
  const now = new Date();
  switch (range) {
    case 'today':
      now.setHours(0, 0, 0, 0);
      return now.toISOString();
    case 'this_week':
      now.setDate(now.getDate() - 7);
      return now.toISOString();
    case 'this_month':
      now.setDate(now.getDate() - 30);
      return now.toISOString();
    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const parsed = mapPinsQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { min_lng, min_lat, max_lng, max_lat, limit, time_range, min_rating } = parsed.data;

    const createdAfter = timeRangeToTimestamp(time_range);

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_map_pins', {
      p_min_lng: min_lng,
      p_min_lat: min_lat,
      p_max_lng: max_lng,
      p_max_lat: max_lat,
      p_limit: limit,
      p_min_rating: min_rating,
      p_created_after: createdAfter,
    });

    if (error) {
      console.error('get_map_pins error:', error);
      return NextResponse.json(
        { error: 'Failed to load map pins' },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ pins: data ?? [] });
    response.headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (err) {
    console.error('Map pins error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
