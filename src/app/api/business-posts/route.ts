import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { businessPostCreateSchema } from '@/lib/validations';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  prefix: 'rl:business-posts',
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const { success } = await ratelimit.limit(`${ip}:${user.id}`);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Verify business plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (profile?.plan !== 'business') {
      return NextResponse.json({ error: 'Business plan required' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = businessPostCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data: post, error } = await supabase
      .from('business_posts')
      .insert({
        user_id: user.id,
        title: parsed.data.title ?? null,
        body: parsed.data.body ?? null,
        image_url: parsed.data.image_url ?? null,
        cloudflare_image_id: parsed.data.cloudflare_image_id ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Business post insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create post' },
        { status: 500 }
      );
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    console.error('Business post create error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    if (!username) {
      return NextResponse.json({ error: 'username query parameter required' }, { status: 400 });
    }

    const limit = Math.min(Math.max(parseInt(limitParam || '20', 10) || 20, 1), 50);
    const offset = Math.max(parseInt(offsetParam || '0', 10) || 0, 0);

    const supabase = await createClient();

    // Resolve username to user ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: posts, error } = await supabase
      .from('business_posts')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Business posts fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ posts: posts ?? [] });
    response.headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (err) {
    console.error('Business posts GET error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
