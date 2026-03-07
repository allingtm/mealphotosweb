import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { leaderboardQuerySchema } from '@/lib/validations/leaderboard';
import { Redis } from '@upstash/redis';
import type { LeaderboardEntry } from '@/types/database';

const redis = Redis.fromEnv();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parsed = leaderboardQuerySchema.safeParse({
    scope: searchParams.get('scope') ?? undefined,
    time_range: searchParams.get('time_range') ?? undefined,
    cuisine: searchParams.get('cuisine') || null,
    country: searchParams.get('country') ?? undefined,
    city: searchParams.get('city') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { scope, time_range, cuisine, country, city, limit, offset } = parsed.data;

  // Redis cache key based on query params
  const cacheKey = `lb:${scope}:${time_range}:${cuisine ?? ''}:${country ?? ''}:${city ?? ''}:${limit}:${offset}`;

  // Try cache
  try {
    const cached = await redis.get<string>(cacheKey);
    if (cached) {
      const response = NextResponse.json(typeof cached === 'string' ? JSON.parse(cached) : cached);
      response.headers.set(
        'Cache-Control',
        'public, max-age=300, stale-while-revalidate=600'
      );
      return response;
    }
  } catch {
    // Redis unavailable — fall through
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_scope: scope,
    p_time_range: time_range,
    p_cuisine: cuisine ?? null,
    p_country: country ?? null,
    p_city: city ?? null,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error('Leaderboard RPC error:', error);
    return NextResponse.json(
      { error: 'Failed to load leaderboard' },
      { status: 500 }
    );
  }

  const body = { entries: (data ?? []) as LeaderboardEntry[] };

  // Cache for 5 minutes
  try {
    await redis.set(cacheKey, JSON.stringify(body), { ex: 300 });
  } catch {
    // Redis unavailable — continue
  }

  const response = NextResponse.json(body);
  response.headers.set(
    'Cache-Control',
    'public, max-age=300, stale-while-revalidate=600'
  );
  return response;
}
