import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'rl:feed-suggestions',
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
  const city = searchParams.get('city');

  const { data, error } = await supabase.rpc('get_follow_suggestions', {
    ...(city ? { p_city: city } : {}),
    p_limit: 5,
  });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to load suggestions', details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ suggestions: data ?? [] });
}
