import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  prefix: 'rl:feed-following-check',
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
  const since = searchParams.get('since');
  if (!since) {
    return NextResponse.json({ error: 'Missing since parameter' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('check_new_following_meals', {
    p_since: since,
  });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to check new meals', details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ count: data ?? 0 });
}
