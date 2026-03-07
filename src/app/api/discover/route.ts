import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { discoverQuerySchema } from '@/lib/validations';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'rl:discover',
});

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const parsed = discoverQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { query, type, group, lat, lng, radius_km, limit } = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('search_businesses', {
      p_query: query ?? null,
      p_type: type ?? null,
      p_group: group ?? null,
      p_lat: lat ?? null,
      p_lng: lng ?? null,
      p_radius_km: radius_km,
      p_limit: limit,
    });

    if (error) {
      console.error('search_businesses error:', error);
      return NextResponse.json(
        { error: 'Failed to search businesses' },
        { status: 500 }
      );
    }

    const results = data ?? [];

    // Split into near_you (has distance) and popular (sorted by rating)
    const nearYou = results
      .filter((r: { distance_km: number | null }) => r.distance_km != null)
      .sort((a: { distance_km: number | null }, b: { distance_km: number | null }) =>
        (a.distance_km ?? 0) - (b.distance_km ?? 0)
      );

    const popular = [...results]
      .sort((a: { avg_rating: number | null }, b: { avg_rating: number | null }) =>
        (b.avg_rating ?? 0) - (a.avg_rating ?? 0)
      );

    const response = NextResponse.json({ near_you: nearYou, popular, total: results.length });
    response.headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (err) {
    console.error('Discover error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
