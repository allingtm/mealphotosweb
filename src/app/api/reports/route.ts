import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reportSchema, getReportPriority } from '@/lib/validations';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 d'),
  prefix: 'rl:reports',
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many reports. Try again tomorrow.' },
        { status: 429 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { reported_meal_id, reported_user_id, reason, detail } = parsed.data;

    if (reported_user_id && reported_user_id === user.id) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
    }

    // Check meal ownership for self-report prevention
    if (reported_meal_id) {
      const { data: meal } = await supabase
        .from('meals')
        .select('user_id')
        .eq('id', reported_meal_id)
        .single();
      if (meal?.user_id === user.id) {
        return NextResponse.json({ error: 'Cannot report your own meal' }, { status: 400 });
      }
    }

    const priority = getReportPriority(reason);

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_meal_id: reported_meal_id ?? null,
      reported_user_id: reported_user_id ?? null,
      reason,
      detail: detail ?? null,
      priority,
    });

    if (error) {
      console.error('Report insert error:', error);
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('Reports error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
