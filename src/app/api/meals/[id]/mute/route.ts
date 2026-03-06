import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'rl:comments:mute',
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mealId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { success } = await ratelimit.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Verify user is the meal author
    const { data: meal } = await supabase
      .from('meals')
      .select('user_id, comments_muted')
      .eq('id', mealId)
      .single();

    if (!meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    if (meal.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const newMuted = !meal.comments_muted;

    const { error } = await supabase
      .from('meals')
      .update({ comments_muted: newMuted })
      .eq('id', mealId);

    if (error) {
      console.error('Mute toggle error:', error);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ comments_muted: newMuted });
  } catch (err) {
    console.error('Mute POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
