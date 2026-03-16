import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { applyRateLimit } from '@/lib/rate-limit';
import { createCommentSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'write');
  if (rateLimited) return rateLimited;

  const body = await req.json();
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const { dish_id, text } = parsed.data;

  // Check comments_enabled
  const { data: dish } = await supabase
    .from('dishes')
    .select('comments_enabled, business_id')
    .eq('id', dish_id)
    .single();

  if (!dish) return NextResponse.json({ error: 'Dish not found' }, { status: 404 });

  if (!dish.comments_enabled) {
    return NextResponse.json({ error: 'Comments are disabled for this dish' }, { status: 403 });
  }

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({ dish_id, user_id: user.id, text })
    .select(`
      id, dish_id, user_id, text, visible, created_at,
      profiles!inner(username, display_name, avatar_url, is_business)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const isBusinessReply = user.id === dish.business_id;

  return NextResponse.json({
    ...comment,
    is_business_owner: isBusinessReply,
  }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'write');
  if (rateLimited) return rateLimited;

  const commentId = req.nextUrl.searchParams.get('id');
  if (!commentId) return NextResponse.json({ error: 'Comment ID required' }, { status: 400 });

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profile?.is_admin) {
      const serviceClient = createServiceRoleClient();
      const { error: adminError } = await serviceClient
        .from('comments')
        .delete()
        .eq('id', commentId);
      if (adminError) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
  }

  return NextResponse.json({ success: true });
}
