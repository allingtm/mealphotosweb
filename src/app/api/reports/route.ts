import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
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

    const { reported_meal_id, reported_user_id, reported_comment_id, reason, detail } = parsed.data;

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

    // Check comment ownership for self-report prevention
    if (reported_comment_id) {
      const svc = createServiceRoleClient();
      const { data: comment } = await svc
        .from('comments')
        .select('user_id')
        .eq('id', reported_comment_id)
        .single();
      if (comment?.user_id === user.id) {
        return NextResponse.json({ error: 'Cannot report your own comment' }, { status: 400 });
      }
    }

    const priority = getReportPriority(reason);

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_meal_id: reported_meal_id ?? null,
      reported_user_id: reported_user_id ?? null,
      reported_comment_id: reported_comment_id ?? null,
      reason,
      detail: detail ?? null,
      priority,
    });

    if (error) {
      console.error('Report insert error:', error);
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }

    // Retroactive moderation + auto-hide for meal reports
    if (reported_meal_id) {
      const serviceClient = createServiceRoleClient();

      // Check if Cloud Vision was run on this meal
      const { data: moderation } = await serviceClient
        .from('meal_moderation')
        .select('cloud_vision_checked')
        .eq('meal_id', reported_meal_id)
        .single();

      if (moderation && !moderation.cloud_vision_checked) {
        // Get meal image URL and user_id for retroactive Vision check
        const { data: meal } = await serviceClient
          .from('meals')
          .select('photo_url, user_id')
          .eq('id', reported_meal_id)
          .single();

        if (meal?.photo_url) {
          // Fire-and-forget retroactive Cloud Vision check
          fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/moderate-meal`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'x-edge-secret': process.env.EDGE_FUNCTION_SECRET!,
              },
              body: JSON.stringify({
                meal_id: reported_meal_id,
                image_url: `${meal.photo_url}/feed`,
                user_id: meal.user_id,
                force_vision: true,
              }),
            }
          ).catch((err: unknown) => {
            console.error('Retroactive moderation invoke failed:', err);
          });

          console.log(JSON.stringify({
            event: 'moderation_retroactive',
            user_id: meal.user_id,
            meal_id: reported_meal_id,
            triggered_by: 'report',
          }));
        }
      }

      // Auto-hide at 3 distinct reporters
      const { count } = await serviceClient
        .from('reports')
        .select('reporter_id', { count: 'exact', head: true })
        .eq('reported_meal_id', reported_meal_id)
        .eq('status', 'pending');

      if ((count ?? 0) >= 3) {
        await serviceClient
          .from('meal_moderation')
          .update({ status: 'manual_review' })
          .eq('meal_id', reported_meal_id);
      }
    }

    // Auto-hide comment at 3 distinct reporters
    if (reported_comment_id) {
      const serviceClient = createServiceRoleClient();
      const { count: commentReportCount } = await serviceClient
        .from('reports')
        .select('reporter_id', { count: 'exact', head: true })
        .eq('reported_comment_id', reported_comment_id)
        .eq('status', 'pending');

      if ((commentReportCount ?? 0) >= 3) {
        // Hide the comment
        await serviceClient
          .from('comments')
          .update({ visible: false })
          .eq('id', reported_comment_id);

        // Notify the commenter
        const { data: hiddenComment } = await serviceClient
          .from('comments')
          .select('user_id, meal_id, meals!inner(title)')
          .eq('id', reported_comment_id)
          .single();

        if (hiddenComment) {
          const mealData = hiddenComment.meals as unknown as { title: string };
          await serviceClient.from('notifications').insert({
            user_id: hiddenComment.user_id,
            type: 'comment_hidden',
            title: `Your comment on ${mealData.title} was hidden for review`,
            data: { meal_id: hiddenComment.meal_id, comment_id: reported_comment_id },
          });
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('Reports error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
