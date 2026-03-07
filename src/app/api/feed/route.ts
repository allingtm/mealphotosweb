import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Number(searchParams.get('limit') ?? 10), 20);

  const supabase = await createClient();

  // Check if user is authenticated (private meals are user-specific, skip cache)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // Try Redis cache for non-cursor (first page) requests — anonymous users only
  const cacheKey = !isAuthenticated && !cursor ? `feed:first:${limit}` : null;
  if (cacheKey) {
    try {
      const cached = await redis.get<string>(cacheKey);
      if (cached) {
        const response = NextResponse.json(typeof cached === 'string' ? JSON.parse(cached) : cached);
        response.headers.set(
          'Cache-Control',
          'public, max-age=60, stale-while-revalidate=120'
        );
        return response;
      }
    } catch {
      // Redis unavailable — fall through to DB
    }
  }

  const { data, error } = await supabase.rpc('get_feed', {
    p_limit: limit,
    ...(cursor ? { p_cursor: cursor } : {}),
  });

  if (error) {
    console.error('Feed RPC error:', error);
    return NextResponse.json(
      { error: 'Failed to load feed' },
      { status: 500 }
    );
  }

  const nextCursor =
    data && data.length === limit
      ? data[data.length - 1].created_at
      : null;

  const body = { meals: data ?? [], nextCursor };

  // Cache first page in Redis (60s TTL) — anonymous users only
  if (cacheKey) {
    try {
      await redis.set(cacheKey, JSON.stringify(body), { ex: 60 });
    } catch {
      // Redis unavailable — continue
    }
  }

  const response = NextResponse.json(body);
  response.headers.set(
    'Cache-Control',
    isAuthenticated
      ? 'private, no-cache'
      : 'public, max-age=60, stale-while-revalidate=120'
  );
  return response;
}
