import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { commentSchema } from '@/lib/validations';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const readRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'rl:comments:read',
});

const writeRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'rl:comments:write',
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mealId } = await params;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const { success } = await readRatelimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(Number(searchParams.get('limit') ?? 5), 20);

    const supabase = await createClient();

    // Fetch meal author for is_author flag
    const serviceClient = createServiceRoleClient();
    const { data: meal } = await serviceClient
      .from('meals')
      .select('user_id')
      .eq('id', mealId)
      .single();

    if (!meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    // Build query — RLS handles visibility for private meals
    let query = supabase
      .from('comments')
      .select('id, meal_id, user_id, text, visible, created_at, profiles!inner(username, display_name, avatar_url)')
      .eq('meal_id', mealId)
      .eq('visible', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: comments, error } = await query;

    if (error) {
      console.error('Comments fetch error:', error);
      return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 });
    }

    // Reverse to ASC order for display
    const sorted = (comments ?? []).reverse();

    // Add is_author flag
    const enriched = sorted.map((c) => ({
      ...c,
      is_author: c.user_id === meal.user_id,
    }));

    // Determine if there are more comments
    const hasMore = (comments ?? []).length === limit;
    const nextCursor = sorted.length > 0 ? sorted[0].created_at : null;

    return NextResponse.json({ comments: enriched, nextCursor, hasMore });
  } catch (err) {
    console.error('Comments GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const { success } = await writeRatelimit.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: 'Too many comments. Slow down.' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = commentSchema.safeParse({ meal_id: mealId, text: body.text });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check comments_enabled
    const serviceClient = createServiceRoleClient();
    const { data: meal } = await serviceClient
      .from('meals')
      .select('user_id, title, comments_enabled, comments_muted')
      .eq('id', mealId)
      .single();

    if (!meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    if (!meal.comments_enabled) {
      return NextResponse.json(
        { error: 'Comments are turned off for this meal' },
        { status: 403 }
      );
    }

    // Insert comment (RLS enforces private meal access)
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        meal_id: mealId,
        user_id: user.id,
        text: parsed.data.text,
      })
      .select('id, meal_id, user_id, text, visible, created_at')
      .single();

    if (error) {
      console.error('Comment insert error:', error);
      return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
    }

    // Get commenter profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', user.id)
      .single();

    const enrichedComment = {
      ...comment,
      is_author: user.id === meal.user_id,
      profiles: profile ?? { username: 'unknown', display_name: null, avatar_url: null },
    };

    // Async notification logic (non-blocking)
    sendCommentNotifications(
      serviceClient,
      comment.id,
      mealId,
      meal.user_id,
      meal.title,
      meal.comments_muted,
      user.id,
      profile?.username ?? 'someone'
    ).catch((err: unknown) => {
      console.error('Comment notification error:', err);
    });

    return NextResponse.json(enrichedComment, { status: 201 });
  } catch (err) {
    console.error('Comments POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function sendCommentNotifications(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  commentId: string,
  mealId: string,
  mealAuthorId: string,
  mealTitle: string,
  commentsMuted: boolean,
  commenterId: string,
  commenterUsername: string
) {
  // Don't notify if commenter is the meal author
  if (commenterId === mealAuthorId) return;

  // Notify meal author (unless muted)
  if (!commentsMuted) {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    // Check for existing recent notification to batch
    const { data: existing } = await serviceClient
      .from('notifications')
      .select('id, data')
      .eq('user_id', mealAuthorId)
      .eq('type', 'new_comment')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    const recentForMeal = existing?.find(
      (n) => (n.data as Record<string, unknown>)?.meal_id === mealId
    );

    if (recentForMeal) {
      const currentCount = ((recentForMeal.data as Record<string, unknown>)?.count as number) || 1;
      await serviceClient
        .from('notifications')
        .update({
          title: `💬 ${currentCount + 1} new comments on your ${mealTitle}`,
          data: { meal_id: mealId, comment_id: commentId, count: currentCount + 1 },
          read: false,
        })
        .eq('id', recentForMeal.id);
    } else {
      await serviceClient.from('notifications').insert({
        user_id: mealAuthorId,
        type: 'new_comment',
        title: `💬 @${commenterUsername} commented on your ${mealTitle}`,
        data: { meal_id: mealId, comment_id: commentId, count: 1 },
      });
    }
  }

  // Thread notifications: notify previous commenters (first time only, in-app)
  const { data: previousCommenters } = await serviceClient
    .from('comments')
    .select('user_id')
    .eq('meal_id', mealId)
    .eq('visible', true)
    .neq('user_id', commenterId)
    .neq('user_id', mealAuthorId);

  if (previousCommenters && previousCommenters.length > 0) {
    // Get distinct user IDs
    const uniqueUserIds = [...new Set(previousCommenters.map((c) => c.user_id))];

    for (const userId of uniqueUserIds) {
      // Check if they already have a thread notification for this specific meal
      const { data: existingThread } = await serviceClient
        .from('notifications')
        .select('id, data')
        .eq('user_id', userId)
        .eq('type', 'comment_thread')
        .limit(20);

      const hasThreadForMeal = existingThread?.some(
        (n) => (n.data as Record<string, unknown>)?.meal_id === mealId
      );

      if (!hasThreadForMeal) {
        await serviceClient.from('notifications').insert({
          user_id: userId,
          type: 'comment_thread',
          title: `💬 @${commenterUsername} also commented on ${mealTitle}`,
          data: { meal_id: mealId, comment_id: commentId },
        });
      }
    }
  }
}
