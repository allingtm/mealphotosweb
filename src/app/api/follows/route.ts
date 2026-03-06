import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { followSchema } from '@/lib/validations';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'rl:follows',
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = followSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { following_id, notify_on_upload } = parsed.data;

    if (following_id === user.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Check blocked in both directions
    const { data: blocked } = await supabase
      .from('blocked_users')
      .select('blocker_id')
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${following_id}),and(blocker_id.eq.${following_id},blocked_id.eq.${user.id})`)
      .limit(1);

    if (blocked && blocked.length > 0) {
      return NextResponse.json({ error: 'Cannot follow this user' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id, notify_on_upload })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already following' }, { status: 409 });
      }
      console.error('Follow insert error:', error);
      return NextResponse.json({ error: 'Failed to follow' }, { status: 500 });
    }

    return NextResponse.json({ follow: data }, { status: 201 });
  } catch (err) {
    console.error('Follow error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
