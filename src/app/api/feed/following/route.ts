import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'rl:feed-following',
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { success } = await ratelimit.limit(user.id);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 20);

  const { data, error } = await supabase.rpc('get_following_feed', {
    p_limit: limit,
    ...(cursor ? { p_cursor: cursor } : {}),
  });

  if (error) {
    console.error('Following feed error:', error);
    return NextResponse.json(
      { error: 'Failed to load following feed' },
      { status: 500 }
    );
  }

  const nextCursor =
    data && data.length === limit
      ? data[data.length - 1].created_at
      : null;

  return NextResponse.json({ meals: data ?? [], nextCursor });
}
