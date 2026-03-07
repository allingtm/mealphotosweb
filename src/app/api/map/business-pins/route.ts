import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapPinsQuerySchema } from '@/lib/validations/map';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'rl:map-business-pins',
});

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const min_lng = parseFloat(searchParams.get('min_lng') || '');
    const min_lat = parseFloat(searchParams.get('min_lat') || '');
    const max_lng = parseFloat(searchParams.get('max_lng') || '');
    const max_lat = parseFloat(searchParams.get('max_lat') || '');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);

    if ([min_lng, min_lat, max_lng, max_lat].some(isNaN)) {
      return NextResponse.json(
        { error: 'min_lng, min_lat, max_lng, max_lat are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_map_business_pins', {
      p_min_lng: min_lng,
      p_min_lat: min_lat,
      p_max_lng: max_lng,
      p_max_lat: max_lat,
      p_limit: limit,
    });

    if (error) {
      console.error('get_map_business_pins error:', error);
      return NextResponse.json(
        { error: 'Failed to load business pins' },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ pins: data ?? [] });
    response.headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (err) {
    console.error('Map business pins error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
