import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notificationQuerySchema, markReadSchema } from '@/lib/validations';

// GET /api/notifications — list notifications for the current user
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = notificationQuerySchema.safeParse({
    cursor: searchParams.get('cursor') || undefined,
    limit: searchParams.get('limit') || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid parameters', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { cursor, limit } = parsed.data;

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Notifications query error:', error);
    return NextResponse.json(
      { error: 'Failed to load notifications' },
      { status: 500 }
    );
  }

  const nextCursor =
    data && data.length === limit
      ? data[data.length - 1].created_at
      : null;

  return NextResponse.json({ notifications: data ?? [], nextCursor });
}

// PATCH /api/notifications — mark notifications as read
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = markReadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { notification_ids } = parsed.data;

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .in('id', notification_ids);

  if (error) {
    console.error('Mark notifications read error:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
